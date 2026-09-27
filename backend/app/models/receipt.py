import uuid
from datetime import date, datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import String, Float, Date, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ReceiptStatus(str, PyEnum):
    processing = "processing"
    needs_review = "needs_review"
    confirmed = "confirmed"
    failed = "failed"


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Nullable because manually-entered receipts (see routers/receipts.py
    # create_manual_receipt) have no photo at all.
    image_path: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[ReceiptStatus] = mapped_column(
        Enum(ReceiptStatus), default=ReceiptStatus.processing, nullable=False
    )
    # "scanned" (OCR + LLM pipeline) or "manual" (typed in directly).
    source: Mapped[str] = mapped_column(String, default="scanned", nullable=False)

    vendor: Mapped[str | None] = mapped_column(String, nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    total: Mapped[float | None] = mapped_column(Float, nullable=True)
    tax: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str | None] = mapped_column(String, nullable=True)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    line_items: Mapped[list | None] = mapped_column(JSON, nullable=True)

    raw_ocr_text: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # per-field confidence flags
    dedupe_hash: Mapped[str | None] = mapped_column(String, nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    owner = relationship("User", back_populates="receipts")
