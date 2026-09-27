"""Shared query filtering so /receipts and /export/csv always filter
identically — the export should always match what's on screen."""
from datetime import date

from sqlalchemy.orm import Query

from app.models.receipt import Receipt


def apply_receipt_filters(
    query: Query,
    vendor: str | None = None,
    category: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    q: str | None = None,
) -> Query:
    if vendor:
        query = query.filter(Receipt.vendor == vendor)
    if category:
        query = query.filter(Receipt.category == category)
    if date_from:
        query = query.filter(Receipt.purchase_date >= date_from)
    if date_to:
        query = query.filter(Receipt.purchase_date <= date_to)
    if q:
        query = query.filter(Receipt.vendor.ilike(f"%{q}%"))
    return query
