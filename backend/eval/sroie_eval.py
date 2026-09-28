"""Accuracy evaluation against the public SROIE dataset (ICDAR 2019 Task 3:
key information extraction) -- runs the app's real OCR + Gemini pipeline
against a sample of real receipt photos with known-correct answers, so the
project has a verifiable accuracy number instead of an anecdotal "it works".

Usage:
    cd backend && .venv/bin/python -m eval.sroie_eval --dataset-dir <path> --sample 180

The dataset dir must contain img/*.jpg and key/*.json (SROIE's own layout;
see https://github.com/zzzDavid/ICDAR-2019-SROIE for a public mirror).

Only compares the three fields SROIE's ground truth and this app's schema
both have: vendor (SROIE's "company"), purchase_date ("date"), total
("total"). SROIE's "address" has no equivalent field in ExtractedReceipt,
so it's not scored.
"""
import argparse
import json
import random
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.extract import extract_receipt_fields
from app.services.ocr import run_ocr

# gemini-3.5-flash-lite free tier: 30 requests/minute. 2.5s between calls
# stays comfortably under that with margin for retries inside extract_receipt_fields.
_SECONDS_BETWEEN_CALLS = 2.5

_DATE_FORMATS = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%m/%d/%Y"]


def _normalize_text(s: str | None) -> str:
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9 ]", "", s)
    s = re.sub(r"\s+", " ", s)
    return s


def _parse_ground_truth_date(raw: str) -> date | None:
    from datetime import datetime

    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _parse_total(raw: str | float | None) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    cleaned = re.sub(r"[^0-9.]", "", raw)
    try:
        return float(cleaned)
    except ValueError:
        return None


@dataclass
class FieldTally:
    correct: int = 0
    total: int = 0

    def record(self, is_correct: bool) -> None:
        self.total += 1
        if is_correct:
            self.correct += 1

    @property
    def accuracy(self) -> float:
        return self.correct / self.total if self.total else 0.0


@dataclass
class EvalResult:
    vendor: FieldTally = field(default_factory=FieldTally)
    purchase_date: FieldTally = field(default_factory=FieldTally)
    total: FieldTally = field(default_factory=FieldTally)
    extraction_failures: int = 0
    per_receipt: list[dict] = field(default_factory=list)


def evaluate(dataset_dir: Path, sample_size: int, seed: int) -> EvalResult:
    img_dir = dataset_dir / "img"
    key_dir = dataset_dir / "key"
    all_ids = sorted(p.stem for p in img_dir.glob("*.jpg"))
    if not all_ids:
        raise SystemExit(f"No images found in {img_dir}")

    rng = random.Random(seed)
    sample_ids = rng.sample(all_ids, min(sample_size, len(all_ids)))

    result = EvalResult()

    for i, receipt_id in enumerate(sample_ids, start=1):
        img_path = img_dir / f"{receipt_id}.jpg"
        key_path = key_dir / f"{receipt_id}.json"
        if not key_path.exists():
            continue
        ground_truth = json.loads(key_path.read_text())

        try:
            ocr_text = run_ocr(str(img_path))
        except Exception:
            ocr_text = ""

        # Gemini's free-tier lite models occasionally return a transient
        # 503 ("high demand") -- extract_receipt_fields already fails fast
        # on these (see app/services/extract.py) rather than hanging, but
        # for an eval run (unlike a single user upload) it's worth a couple
        # of spaced-out retries so a passing transient blip doesn't get
        # miscounted as a real accuracy failure.
        extracted = extract_receipt_fields(str(img_path), ocr_text)
        retry_delay = 10
        while extracted.error and "high demand" in extracted.error.lower() and retry_delay <= 40:
            print(f"  ...transient 503, retrying in {retry_delay}s")
            time.sleep(retry_delay)
            extracted = extract_receipt_fields(str(img_path), ocr_text)
            retry_delay *= 2

        if extracted.error:
            result.extraction_failures += 1

        gt_vendor = _normalize_text(ground_truth.get("company"))
        pred_vendor = _normalize_text(extracted.vendor)
        vendor_correct = bool(gt_vendor) and gt_vendor == pred_vendor

        gt_date = _parse_ground_truth_date(ground_truth.get("date", ""))
        date_correct = bool(gt_date) and gt_date == extracted.purchase_date

        gt_total = _parse_total(ground_truth.get("total"))
        total_correct = (
            gt_total is not None
            and extracted.total is not None
            and abs(gt_total - extracted.total) < 0.01
        )

        result.vendor.record(vendor_correct)
        result.purchase_date.record(date_correct)
        result.total.record(total_correct)

        result.per_receipt.append(
            {
                "id": receipt_id,
                "vendor": {"expected": ground_truth.get("company"), "got": extracted.vendor, "correct": vendor_correct},
                "purchase_date": {"expected": ground_truth.get("date"), "got": str(extracted.purchase_date), "correct": date_correct},
                "total": {"expected": ground_truth.get("total"), "got": extracted.total, "correct": total_correct},
            }
        )

        print(
            f"[{i}/{len(sample_ids)}] {receipt_id}: "
            f"vendor={'OK' if vendor_correct else 'x'} "
            f"date={'OK' if date_correct else 'x'} "
            f"total={'OK' if total_correct else 'x'}"
        )

        if i < len(sample_ids):
            time.sleep(_SECONDS_BETWEEN_CALLS)

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset-dir", type=Path, required=True)
    parser.add_argument("--sample", type=int, default=180)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", type=Path, default=Path("eval/sroie_results.json"))
    args = parser.parse_args()

    result = evaluate(args.dataset_dir, args.sample, args.seed)

    n = result.vendor.total
    summary = {
        "sample_size": n,
        "extraction_failures": result.extraction_failures,
        "accuracy": {
            "vendor": round(result.vendor.accuracy, 4),
            "purchase_date": round(result.purchase_date.accuracy, 4),
            "total": round(result.total.accuracy, 4),
            "overall": round(
                (result.vendor.correct + result.purchase_date.correct + result.total.correct)
                / (3 * n),
                4,
            )
            if n
            else 0.0,
        },
        "per_receipt": result.per_receipt,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(summary, indent=2, default=str))

    print("\n=== Summary ===")
    print(f"Sample size: {n}")
    print(f"Vendor accuracy:  {summary['accuracy']['vendor'] * 100:.1f}%")
    print(f"Date accuracy:    {summary['accuracy']['purchase_date'] * 100:.1f}%")
    print(f"Total accuracy:   {summary['accuracy']['total'] * 100:.1f}%")
    print(f"Overall accuracy: {summary['accuracy']['overall'] * 100:.1f}%")
    print(f"Extraction failures: {result.extraction_failures}")
    print(f"\nFull results written to {args.out}")


if __name__ == "__main__":
    main()
