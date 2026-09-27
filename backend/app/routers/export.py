import io
from datetime import date

import pandas as pd
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.receipt import Receipt
from app.models.user import User
from app.services.filters import apply_receipt_filters

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/csv")
def export_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    vendor: str | None = None,
    category: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    q: str | None = Query(None, description="Search vendor by partial match"),
):
    """Exports whatever the filters match — same query params as GET /receipts,
    so the CSV always matches what the dashboard has filtered to on screen."""
    query = db.query(Receipt).filter(Receipt.owner_id == current_user.id)
    query = apply_receipt_filters(query, vendor, category, date_from, date_to, q)
    receipts = query.order_by(Receipt.purchase_date).all()

    rows = [
        {
            "date": r.purchase_date,
            "vendor": r.vendor,
            "category": r.category,
            "total": r.total,
            "tax": r.tax,
            "currency": r.currency,
            "status": r.status.value,
            "source": r.source,
        }
        for r in receipts
    ]
    df = pd.DataFrame(rows)
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    buffer.seek(0)

    # Filename reflects the date range, when one is set, so a downloaded
    # file is self-describing (e.g. "receipts_2026-09-01_to_2026-09-30.csv").
    if date_from or date_to:
        filename = f"receipts_{date_from or 'start'}_to_{date_to or 'now'}.csv"
    else:
        filename = "receipts.csv"

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
