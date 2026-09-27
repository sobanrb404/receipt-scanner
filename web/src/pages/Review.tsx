import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Receipt, ReceiptUpdatePayload } from "../api/types";
import { StatusPill } from "../components/StatusPill";

const CATEGORIES = ["food", "transport", "office", "software", "travel", "utilities", "other"];

/** Fields with confidence below this are highlighted for a second look. */
const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function Review() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [form, setForm] = useState<ReceiptUpdatePayload>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const fetchReceipt = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<Receipt>(`/receipts/${id}`);
      setReceipt(data);
      setForm({
        vendor: data.vendor,
        purchase_date: data.purchase_date,
        total: data.total,
        tax: data.tax,
        currency: data.currency,
        category: data.category,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load this receipt.");
    }
  }, [id]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  // While the backend is still running OCR + extraction, poll every 2s so
  // the page updates itself without the user refreshing.
  useEffect(() => {
    if (receipt?.status === "processing") {
      pollRef.current = window.setInterval(fetchReceipt, 2000);
      return () => {
        if (pollRef.current) window.clearInterval(pollRef.current);
      };
    }
  }, [receipt?.status, fetchReceipt]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<Receipt>(`/receipts/${id}`, { ...form, status: "confirmed" });
      setReceipt(updated);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await api.delete(`/receipts/${id}`);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete this receipt.");
      setDeleting(false);
    }
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!receipt) {
    return <p className="text-[var(--color-ink-soft)]">Loading…</p>;
  }

  if (receipt.status === "processing") {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <StatusPill status="processing" />
        <p className="mt-4 text-[var(--color-ink-soft)]">
          Reading your receipt — this usually takes a few seconds.
        </p>
      </div>
    );
  }

  const confidence = receipt.confidence ?? {};
  const isLowConfidence = (field: string) => (confidence[field] ?? 1) < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Review receipt</h1>
        <StatusPill status={receipt.status} />
      </div>

      {receipt.status === "needs_review" && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2 mb-5">
          Some fields had low confidence — double-check the highlighted ones below.
        </p>
      )}

      <div className="bg-[var(--color-paper-raised)] border border-[var(--color-line)] rounded-lg p-6 flex flex-col gap-4">
        <Field
          label="Vendor"
          flagged={isLowConfidence("vendor")}
          value={form.vendor ?? ""}
          onChange={(v) => setForm((f) => ({ ...f, vendor: v }))}
        />
        <Field
          label="Date"
          type="date"
          flagged={isLowConfidence("purchase_date")}
          value={form.purchase_date ?? ""}
          onChange={(v) => setForm((f) => ({ ...f, purchase_date: v }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Total"
            type="number"
            flagged={isLowConfidence("total")}
            value={form.total ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, total: v === "" ? null : Number(v) }))}
          />
          <Field
            label="Tax"
            type="number"
            value={form.tax ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, tax: v === "" ? null : Number(v) }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Currency"
            value={form.currency ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, currency: v }))}
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink-soft)]">Category</span>
            <select
              value={form.category ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="border border-[var(--color-line)] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">—</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        {receipt.line_items && receipt.line_items.length > 0 && (
          <div>
            <p className="text-sm font-medium text-[var(--color-ink-soft)] mb-2">Line items</p>
            <div className="border border-[var(--color-line)] rounded-md divide-y divide-[var(--color-line)]">
              {receipt.line_items.map((item, i) => (
                <div key={i} className="flex justify-between px-3 py-2 text-sm">
                  <span>{item.description}</span>
                  <span className="font-mono tabular-nums">{item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-4">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--color-ink)] text-white rounded-md px-4 py-2.5 font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Confirm & save"}
        </button>

        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-ink-soft)]">Delete this receipt?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 rounded-md px-3 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="text-[var(--color-ink-soft)] rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-red-600 rounded-md px-4 py-2.5 font-medium hover:bg-red-50"
          >
            Delete
          </button>
        )}

        <Link
          to="/"
          className="ml-auto text-[var(--color-ink-soft)] rounded-md px-4 py-2.5 font-medium hover:bg-slate-100"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  flagged = false,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  flagged?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--color-ink-soft)] flex items-center gap-1.5">
        {label}
        {flagged && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Low confidence" />}
      </span>
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${
          flagged ? "border-amber-400 bg-amber-50" : "border-[var(--color-line)]"
        }`}
      />
    </label>
  );
}
