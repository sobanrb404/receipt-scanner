from datetime import date

from app.schemas.receipt import ExtractedReceipt
from app.services.dedupe import compute_dedupe_hash


def test_same_receipt_produces_same_hash():
    r1 = ExtractedReceipt(vendor="Cafe Aylanto", purchase_date=date(2026, 3, 5), total=23.50)
    r2 = ExtractedReceipt(vendor="cafe aylanto", purchase_date=date(2026, 3, 5), total=23.50)
    assert compute_dedupe_hash(r1) == compute_dedupe_hash(r2)


def test_missing_fields_return_no_hash():
    r = ExtractedReceipt(vendor="Cafe Aylanto", purchase_date=None, total=23.50)
    assert compute_dedupe_hash(r) is None


def test_different_totals_produce_different_hashes():
    r1 = ExtractedReceipt(vendor="Cafe Aylanto", purchase_date=date(2026, 3, 5), total=23.50)
    r2 = ExtractedReceipt(vendor="Cafe Aylanto", purchase_date=date(2026, 3, 5), total=24.00)
    assert compute_dedupe_hash(r1) != compute_dedupe_hash(r2)
