"""Image preprocessing + OCR. Pure functions, no DB/network dependency,
so this is easy to unit test and to swap engines later.

This is used as a *hint* for the LLM extraction step (see services/extract.py),
not the primary source of truth — Tesseract reliably mangles blurry or
low-contrast phone photos, and the preprocessing below only partially
compensates for that."""
import cv2
import numpy as np
import pytesseract
from PIL import Image

# Small/low-res photos OCR noticeably worse; upscaling gives Tesseract more
# pixels per character to work with.
_MIN_DIMENSION = 1500


def preprocess_image(image_path: str) -> np.ndarray:
    """Upscale (if small), grayscale and adaptively threshold a receipt
    photo so OCR reads it more reliably than it would from the raw photo.

    Adaptive thresholding (vs. a single global Otsu threshold) handles the
    uneven lighting and glare common in phone photos of receipts — a global
    threshold can wash out one half of the receipt while leaving the other
    half illegible.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")

    height, width = img.shape[:2]
    if max(height, width) < _MIN_DIMENSION:
        scale = _MIN_DIMENSION / max(height, width)
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Slight blur removes camera noise before thresholding.
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    # Adaptive (per-region) thresholding copes with shadows/glare far better
    # than a single global threshold across the whole receipt.
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15
    )
    return thresh


def run_ocr(image_path: str) -> str:
    """Returns raw extracted text from a receipt image."""
    processed = preprocess_image(image_path)
    pil_img = Image.fromarray(processed)
    text = pytesseract.image_to_string(pil_img)
    return text.strip()
