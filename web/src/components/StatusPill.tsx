import type { ReceiptStatus } from "../api/types";

const STYLES: Record<ReceiptStatus, string> = {
  processing: "bg-slate-100 text-slate-600",
  needs_review: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

const LABELS: Record<ReceiptStatus, string> = {
  processing: "Processing",
  needs_review: "Needs review",
  confirmed: "Confirmed",
  failed: "Failed",
};

export function StatusPill({ status }: { status: ReceiptStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium tracking-wide ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
