import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Receipt, ReceiptFilters } from "../api/types";
import { StatusPill } from "../components/StatusPill";
import { CategoryBarChart } from "../components/charts/CategoryBarChart";
import { SpendTrendChart } from "../components/charts/SpendTrendChart";
import { TopVendorsChart } from "../components/charts/TopVendorsChart";
import { CategoryDonutChart } from "../components/charts/CategoryDonutChart";
import { MonthlyComparisonChart } from "../components/charts/MonthlyComparisonChart";
import { PERIOD_OPTIONS, getPeriodRange, type PeriodKey } from "../utils/dateRanges";

type AnalysisTab = "category" | "trend" | "vendors" | "share" | "monthly";

const ANALYSIS_TABS: { key: AnalysisTab; label: string }[] = [
  { key: "category", label: "By category" },
  { key: "trend", label: "Over time" },
  { key: "vendors", label: "Top vendors" },
  { key: "share", label: "Category share" },
  { key: "monthly", label: "This vs last month" },
];

export function Dashboard() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReceiptFilters>({});
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("category");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // null = a custom range was picked with the date inputs, not a preset.
  const [activePeriod, setActivePeriod] = useState<PeriodKey | null>("all_time");

  function handlePeriodChange(period: PeriodKey) {
    setActivePeriod(period);
    const { from, to } = getPeriodRange(period);
    setFilters((f) => ({ ...f, date_from: from, date_to: to }));
  }

  const buildFilterQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    return params.toString();
  }, [filters]);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildFilterQuery();
      const data = await api.get<Receipt[]>(`/receipts${query ? `?${query}` : ""}`);
      setReceipts(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load receipts.");
    } finally {
      setLoading(false);
    }
  }, [buildFilterQuery]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  async function handleExport() {
    setExporting(true);
    try {
      const query = buildFilterQuery();
      const filenameSuffix =
        filters.date_from || filters.date_to
          ? `_${filters.date_from ?? "start"}_to_${filters.date_to ?? "now"}`
          : "";
      await api.downloadFile(`/export/csv${query ? `?${query}` : ""}`, `receipts${filenameSuffix}.csv`);
    } catch {
      setError("Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  }

  const totalSpend = receipts.reduce((sum, r) => sum + (r.total ?? 0), 0);
  const needsReviewCount = receipts.filter((r) => r.status === "needs_review").length;

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await api.delete(`/receipts/${id}`);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete this receipt.");
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || receipts.length === 0}
            className="border border-[var(--color-line)] rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting
              ? "Exporting…"
              : activePeriod && activePeriod !== "all_time"
                ? `Export CSV (${PERIOD_OPTIONS.find((p) => p.key === activePeriod)?.label})`
                : "Export CSV"}
          </button>
          <Link
            to="/manual"
            className="border border-[var(--color-line)] rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5"
          >
            <PlusCircle size={16} />
            Add manually
          </Link>
          <Link
            to="/upload"
            className="bg-[var(--color-ink)] text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Upload receipt
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatTile label="Total spend" value={totalSpend.toFixed(2)} />
        <StatTile label="Receipts" value={String(receipts.length)} />
        <StatTile label="Needs review" value={String(needsReviewCount)} accent={needsReviewCount > 0} />
      </div>

      <div className="bg-[var(--color-paper-raised)] border border-[var(--color-line)] rounded-lg p-5 mb-6">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {ANALYSIS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[var(--color-ink)] text-white"
                  : "text-[var(--color-ink-soft)] hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "category" && <CategoryBarChart receipts={receipts} />}
        {activeTab === "trend" && <SpendTrendChart receipts={receipts} />}
        {activeTab === "vendors" && <TopVendorsChart receipts={receipts} />}
        {activeTab === "share" && <CategoryDonutChart receipts={receipts} />}
        {activeTab === "monthly" && <MonthlyComparisonChart receipts={receipts} />}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => handlePeriodChange(opt.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activePeriod === opt.key
                ? "bg-[var(--color-teal)] border-[var(--color-teal)] text-white"
                : "border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-slate-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search vendor…"
          value={filters.q ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
          className="border border-[var(--color-line)] rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] flex-1 min-w-[180px]"
        />
        <div className="flex items-end gap-1.5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--color-ink-soft)]">From</span>
            <input
              type="date"
              value={filters.date_from ?? ""}
              onChange={(e) => {
                setActivePeriod(null);
                setFilters((f) => ({ ...f, date_from: e.target.value || undefined }));
              }}
              className="border border-[var(--color-line)] rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </label>
          <span className="pb-2 text-[var(--color-ink-soft)]">–</span>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--color-ink-soft)]">To</span>
            <input
              type="date"
              value={filters.date_to ?? ""}
              onChange={(e) => {
                setActivePeriod(null);
                setFilters((f) => ({ ...f, date_to: e.target.value || undefined }));
              }}
              className="border border-[var(--color-line)] rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </label>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-[var(--color-ink-soft)]">Loading…</p>
      ) : receipts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[var(--color-line)] rounded-lg">
          <p className="text-[var(--color-ink-soft)] mb-3">No receipts yet.</p>
          <Link to="/upload" className="text-[var(--color-accent)] font-medium hover:underline">
            Upload your first one
          </Link>
        </div>
      ) : (
        <div className="border border-[var(--color-line)] rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-left">
                <Th>Vendor</Th>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th className="text-right">Total</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/receipts/${r.id}`} className="hover:text-[var(--color-accent)]">
                      {r.vendor ?? <span className="text-[var(--color-ink-soft)]">—</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-soft)]">{r.purchase_date ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--color-ink-soft)]">{r.category ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {r.total != null ? `${r.currency ?? ""} ${r.total.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    {pendingDeleteId === r.id ? (
                      <div className="flex items-center justify-end gap-2 text-sm">
                        <span className="text-[var(--color-ink-soft)]">Delete?</span>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="text-red-600 font-medium hover:underline disabled:opacity-50"
                        >
                          {deletingId === r.id ? "…" : "Yes"}
                        </button>
                        <button
                          onClick={() => setPendingDeleteId(null)}
                          className="text-[var(--color-ink-soft)] hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/receipts/${r.id}`}
                          title="Edit"
                          aria-label="Edit receipt"
                          className="p-1.5 rounded-md text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] hover:bg-orange-50"
                        >
                          <Pencil size={16} />
                        </Link>
                        <button
                          onClick={() => setPendingDeleteId(r.id)}
                          title="Delete"
                          aria-label="Delete receipt"
                          className="p-1.5 rounded-md text-[var(--color-ink-soft)] hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--color-paper-raised)] border border-[var(--color-line)] rounded-lg p-4">
      <p className="text-xs font-mono uppercase tracking-wide text-[var(--color-ink-soft)] mb-1">{label}</p>
      <p className={`text-2xl font-extrabold tabular-nums ${accent ? "text-amber-600" : ""}`}>{value}</p>
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 font-mono text-xs uppercase tracking-wide text-[var(--color-ink-soft)] ${className}`}>
      {children}
    </th>
  );
}
