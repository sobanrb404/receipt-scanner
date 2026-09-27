"""The pipeline: OCR -> LLM extraction -> dedupe check -> save.

Runs as a FastAPI BackgroundTask for now (simplest possible setup — no
Redis/Celery required to get started). Swapping this to a Celery task later
means moving this function's body into a @celery_app.task and enqueuing it
instead of calling it directly; nothing else in the codebase has to change.
"""
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.receipt import Receipt, ReceiptStatus
from app.services.dedupe import compute_dedupe_hash
from app.services.extract import extract_receipt_fields
from app.services.ocr import run_ocr


def process_receipt(receipt_id: str) -> None:
    db: Session = SessionLocal()
    try:
        receipt = db.get(Receipt, receipt_id)
        if receipt is None:
            return

        try:
            # OCR text is passed only as a hint — Gemini reads the image
            # itself as the source of truth (see services/extract.py).
            raw_text = run_ocr(receipt.image_path)
            extracted = extract_receipt_fields(receipt.image_path, raw_text)
        except Exception as exc:  # noqa: BLE001 - a bad image must not crash the job
            receipt.status = ReceiptStatus.failed
            receipt.raw_ocr_text = str(exc)
            db.commit()
            return

        receipt.raw_ocr_text = raw_text
        receipt.vendor = extracted.vendor
        receipt.purchase_date = extracted.purchase_date
        receipt.total = extracted.total
        receipt.tax = extracted.tax
        receipt.currency = extracted.currency
        receipt.category = extracted.category
        receipt.line_items = [item.model_dump() for item in extracted.line_items]
        receipt.confidence = extracted.confidence
        receipt.dedupe_hash = compute_dedupe_hash(extracted)

        # Low confidence on the key fields (or an extraction error) means a
        # human should look at it before it's trusted.
        low_confidence = any(
            extracted.confidence.get(field, 1.0) < 0.6 for field in ("vendor", "total", "purchase_date")
        )
        receipt.status = (
            ReceiptStatus.failed
            if extracted.error
            else ReceiptStatus.needs_review
            if low_confidence
            else ReceiptStatus.confirmed
        )

        db.commit()
    finally:
        db.close()
