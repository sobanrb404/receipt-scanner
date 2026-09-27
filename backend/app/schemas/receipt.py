from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.receipt import ReceiptStatus


class LineItem(BaseModel):
    description: str
    amount: float


class ExtractedReceipt(BaseModel):
    """Strict schema the LLM's JSON output must match. Anything that doesn't
    validate against this triggers a retry in services/extract.py."""

    vendor: str | None = None
    purchase_date: date | None = None
    total: float | None = None
    tax: float | None = None
    currency: str | None = "PKR"
    category: str | None = None
    line_items: list[LineItem] = Field(default_factory=list)
    confidence: dict[str, float] = Field(
        default_factory=dict,
        description="0-1 confidence per field, e.g. {'total': 0.95, 'vendor': 0.4}",
    )
    error: str | None = Field(
        default=None,
        description="Set when extraction failed after all retries; the receipt is flagged for manual review.",
    )


class ReceiptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: ReceiptStatus
    source: str
    vendor: str | None
    purchase_date: date | None
    total: float | None
    tax: float | None
    currency: str | None
    category: str | None
    line_items: list | None
    confidence: dict | None
    created_at: datetime


class ReceiptUpdate(BaseModel):
    """Fields the user can correct during review."""

    vendor: str | None = None
    purchase_date: date | None = None
    total: float | None = None
    tax: float | None = None
    currency: str | None = None
    category: str | None = None
    status: ReceiptStatus | None = None


class ManualReceiptCreate(BaseModel):
    """Body for POST /receipts/manual — a receipt typed in directly, with
    no photo (e.g. a cash purchase, or a receipt that's been lost)."""

    vendor: str = Field(min_length=1)
    purchase_date: date | None = None
    total: float = Field(gt=0)
    tax: float | None = None
    currency: str | None = "PKR"
    category: str | None = None
    line_items: list[LineItem] = Field(default_factory=list)
