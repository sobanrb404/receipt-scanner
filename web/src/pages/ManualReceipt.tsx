import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ManualReceiptPayload, Receipt } from "../api/types";

const CATEGORIES = ["food", "transport", "office", "software", "travel", "utilities", "other"];

export function ManualReceipt() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ManualReceiptPayload>({
    vendor: "",
    purchase_date: "",
    total: 0,
    tax: null,
    currency: "PKR",
    category: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: ManualReceiptPayload = {
        ...form,
        purchase_date: form.purchase_date || null,
        category: form.category || null,
      };
      const receipt = await api.post<Receipt>("/receipts/manual", payload);
      navigate(`/receipts/${receipt.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this receipt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Add a receipt manually</h1>
      <p className="text-[var(--color-ink-soft)] mb-6">
        For a cash purchase or a receipt you don't have a photo of. Saved right away, no scanning needed.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-[var(--color-paper-raised)] border border-[var(--color-line)] rounded-lg p-6 flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--color-ink-soft)]">Vendor</span>
          <input
            type="text"
            required
            value={form.vendor}
            onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
            placeholder="e.g. Corner Store"
            className="border border-[var(--color-line)] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--color-ink-soft)]">Date</span>
          <input
            type="date"
            value={form.purchase_date ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
            className="border border-[var(--color-line)] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink-soft)]">Total</span>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.total || ""}
              onChange={(e) => setForm((f) => ({ ...f, total: Number(e.target.value) }))}
              placeholder="0.00"
              className="border border-[var(--color-line)] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink-soft)]">Tax (optional)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.tax ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value === "" ? null : Number(e.target.value) }))}
              placeholder="0.00"
              className="border border-[var(--color-line)] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink-soft)]">Currency</span>
            <input
              type="text"
              value={form.currency ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              placeholder="PKR"
              className="border border-[var(--color-line)] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </label>
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

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-[var(--color-ink)] text-white rounded-md px-4 py-2.5 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save receipt"}
          </button>
          <Link
            to="/"
            className="text-[var(--color-ink-soft)] rounded-md px-4 py-2.5 font-medium hover:bg-slate-100"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
