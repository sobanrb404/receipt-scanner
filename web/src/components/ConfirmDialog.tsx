import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A real modal confirmation dialog — backdrop + centered card, closable
 * with Escape or by clicking the backdrop — used everywhere the app needs
 * to confirm a meaningful action (delete, save an edit, export). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[var(--color-paper-raised)] border border-[var(--color-line)] rounded-lg shadow-xl p-5"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-[var(--color-ink)] mb-1.5">
          {title}
        </h2>
        {message && <p className="text-sm text-[var(--color-ink-soft)] mb-5">{message}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm font-medium text-[var(--color-ink-soft)] hover:bg-slate-100"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50 ${
              tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-[var(--color-ink)] hover:opacity-90"
            }`}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
