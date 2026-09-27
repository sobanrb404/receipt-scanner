import os
import uuid
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.jobs.process_receipt import process_receipt
from app.models.receipt import Receipt, ReceiptStatus
from app.models.user import User
from app.schemas.receipt import ManualReceiptCreate, ReceiptOut, ReceiptUpdate
from app.services.filters import apply_receipt_filters

router = APIRouter(prefix="/receipts", tags=["receipts"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("", response_model=ReceiptOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_receipt(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG or WEBP images are accepted")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    image_path = os.path.join(settings.upload_dir, filename)
    with open(image_path, "wb") as f:
        f.write(contents)

    receipt = Receipt(owner_id=current_user.id, image_path=image_path, status=ReceiptStatus.processing)
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    background_tasks.add_task(process_receipt, receipt.id)
    return receipt


@router.post("/manual", response_model=ReceiptOut, status_code=status.HTTP_201_CREATED)
def create_manual_receipt(
    payload: ManualReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """For a receipt with no photo — a cash purchase, a lost receipt, etc.
    Saved straight as confirmed since there's no OCR/LLM step to review."""
    receipt = Receipt(
        owner_id=current_user.id,
        image_path=None,
        source="manual",
        status=ReceiptStatus.confirmed,
        vendor=payload.vendor,
        purchase_date=payload.purchase_date,
        total=payload.total,
        tax=payload.tax,
        currency=payload.currency,
        category=payload.category,
        line_items=[item.model_dump() for item in payload.line_items],
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return receipt


@router.get("", response_model=list[ReceiptOut])
def list_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    vendor: str | None = None,
    category: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    q: str | None = Query(None, description="Search vendor by partial match"),
    # High default so the dashboard's charts/totals reflect everything that
    # matches the filters, not a silently-truncated page of it. Bump this
    # (or add real pagination) if an account ever holds thousands of receipts.
    limit: int = Query(1000, le=2000),
    offset: int = 0,
):
    query = db.query(Receipt).filter(Receipt.owner_id == current_user.id)
    query = apply_receipt_filters(query, vendor, category, date_from, date_to, q)
    return query.order_by(Receipt.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/{receipt_id}", response_model=ReceiptOut)
def get_receipt(receipt_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    receipt = _get_owned_receipt(db, receipt_id, current_user)
    return receipt


@router.patch("/{receipt_id}", response_model=ReceiptOut)
def update_receipt(
    receipt_id: str,
    payload: ReceiptUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    receipt = _get_owned_receipt(db, receipt_id, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(receipt, field, value)
    db.commit()
    db.refresh(receipt)
    return receipt


@router.delete("/{receipt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_receipt(receipt_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    receipt = _get_owned_receipt(db, receipt_id, current_user)
    db.delete(receipt)
    db.commit()


def _get_owned_receipt(db: Session, receipt_id: str, current_user: User) -> Receipt:
    receipt = db.get(Receipt, receipt_id)
    if receipt is None or receipt.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt
