"""Cheap duplicate detection: hash vendor + date + total so the same
receipt uploaded twice (e.g. retried photo) is flagged, not double-counted."""
import hashlib

from app.schemas.receipt import ExtractedReceipt


def compute_dedupe_hash(extracted: ExtractedReceipt) -> str | None:
    if not (extracted.vendor and extracted.purchase_date and extracted.total is not None):
        return None
    key = f"{extracted.vendor.strip().lower()}|{extracted.purchase_date}|{extracted.total:.2f}"
    return hashlib.sha256(key.encode()).hexdigest()
