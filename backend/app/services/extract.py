"""Turns a receipt image (+ its OCR text, as a hint) into structured,
validated receipt data using Gemini's multimodal (vision) input.

Why the image, not just OCR text: classical OCR (Tesseract) frequently
mangles blurry or low-contrast photos — e.g. reading "395" as "S95" — and
there's no way to recover the right answer from already-garbled text.
Gemini's vision understanding reads the actual pixels and is far more
robust to blur, skew and glare, so it's the primary source of truth here;
the OCR text is passed along only as a secondary hint (useful for things
like exact reference numbers OCR sometimes gets right).

Kept behind a small interface (extract_receipt_fields) so the LLM provider
can be swapped later without touching callers.
"""
import json
import re

import google.generativeai as genai
from google.api_core.exceptions import GoogleAPIError
from PIL import Image
from pydantic import ValidationError

from app.config import settings
from app.schemas.receipt import ExtractedReceipt

# Bounds each Gemini call so a transient outage (e.g. a 503 "high demand"
# response) fails fast into our own retry loop below, instead of the SDK's
# default retry/backoff hanging for minutes and stalling the whole
# background job. We also disable the SDK's own retry (retry=None) since
# it would otherwise re-introduce the same long, uncontrolled backoff.
_REQUEST_OPTIONS = {"timeout": 30, "retry": None}

_PROMPT_TEMPLATE = """You are an expert at reading receipts. Look at the attached
receipt image carefully and extract the fields below.

The image is the source of truth. Below the image is text a separate OCR
tool extracted from it, given only as a rough hint — OCR frequently misreads
characters (e.g. "3" as "S", "8" as "B"), so if the OCR text and what you can
actually see in the image disagree, trust the image.

Return ONLY a JSON object, no markdown, no explanation, matching exactly this
shape:

{{
  "vendor": string or null,
  "purchase_date": "YYYY-MM-DD" or null,
  "total": number or null,
  "tax": number or null,
  "currency": 3-letter code (e.g. "PKR", "USD") or null,
  "category": one of ["food","transport","office","software","travel","utilities","other"] or null,
  "line_items": [{{"description": string, "amount": number}}, ...],
  "confidence": {{"vendor": 0-1, "purchase_date": 0-1, "total": 0-1}}
}}

Rules:
- If a field genuinely cannot be made out even by looking at the image, use
  null and give it a low confidence score — don't guess.
- "total" must be the final amount paid, not a subtotal.
- Never invent numbers that are not visible in the image.
- Give a LOW confidence score (below 0.5) for any field where the image is
  too blurry, dark or damaged to be certain, even if you provide a best guess.

OCR TEXT (hint only, may contain errors):
---
{ocr_text}
---
"""

_MAX_ATTEMPTS = 2


def _strip_code_fences(text: str) -> str:
    """Gemini sometimes wraps JSON in ```json ... ``` even when told not to."""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return match.group(0) if match else text


def extract_receipt_fields(image_path: str, ocr_text: str = "") -> ExtractedReceipt:
    """Calls Gemini with the receipt image (+ OCR text as a hint), validates
    the JSON against ExtractedReceipt, retries once on invalid output, and
    falls back to an empty (all-null) result rather than raising, so a bad
    receipt never crashes the whole job."""
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(settings.gemini_model)
    prompt = _PROMPT_TEMPLATE.format(ocr_text=ocr_text[:6000])
    image = Image.open(image_path)

    last_error: Exception | None = None
    for _ in range(_MAX_ATTEMPTS):
        try:
            response = model.generate_content([prompt, image], request_options=_REQUEST_OPTIONS)
            raw_json = _strip_code_fences(response.text)
            data = json.loads(raw_json)
            return ExtractedReceipt.model_validate(data)
        except (json.JSONDecodeError, ValidationError, ValueError, GoogleAPIError) as exc:
            last_error = exc
            continue

    # Both attempts failed to produce valid structured data — return an
    # empty result so the receipt is flagged for manual review instead of
    # losing the whole job.
    return ExtractedReceipt(error=str(last_error) if last_error else "unknown extraction error")
