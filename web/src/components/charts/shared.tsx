// Shared helpers so every chart formats/labels data the same way.
import type { Receipt } from "../../api/types";

/** A small categorical palette that reads clearly in this app's light theme.
 * Teal (the app's own accent) leads, then a few analogous/complementary hues. */
export const CHART_PALETTE = [
  "#2f7a6f", // teal (brand)
  "#dd5b25", // orange (brand accent)
  "#4c6fd5", // blue
  "#c9a227", // gold
  "#8a5fc9", // violet
  "#4b5567", // slate (fallback / "other")
];

export const TOOLTIP_STYLE = {
  background: "var(--color-paper-raised)",
  border: "1px solid var(--color-line)",
  borderRadius: 6,
  fontSize: 13,
};

export function formatCurrency(value: number): string {
  return value.toFixed(2);
}

/** Groups receipts by day (YYYY-MM-DD), summing totals, sorted chronologically. */
export function spendByDay(receipts: Receipt[]): { date: string; total: number }[] {
  const byDay = new Map<string, number>();
  for (const r of receipts) {
    if (r.total == null || !r.purchase_date) continue;
    byDay.set(r.purchase_date, (byDay.get(r.purchase_date) ?? 0) + r.total);
  }
  return Array.from(byDay.entries())
    .map(([date, total]) => ({ date, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Groups receipts by vendor, summing totals, sorted descending, capped to topN. */
export function topVendors(receipts: Receipt[], topN = 5): { vendor: string; total: number }[] {
  const byVendor = new Map<string, number>();
  for (const r of receipts) {
    if (r.total == null) continue;
    const key = r.vendor ?? "Unknown";
    byVendor.set(key, (byVendor.get(key) ?? 0) + r.total);
  }
  return Array.from(byVendor.entries())
    .map(([vendor, total]) => ({ vendor, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);
}

/** Groups receipts by category, summing totals, sorted descending. */
export function spendByCategory(receipts: Receipt[]): { category: string; total: number }[] {
  const byCategory = new Map<string, number>();
  for (const r of receipts) {
    if (r.total == null) continue;
    const key = r.category ?? "uncategorized";
    byCategory.set(key, (byCategory.get(key) ?? 0) + r.total);
  }
  return Array.from(byCategory.entries())
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}

/** This-calendar-month total vs. the previous calendar month total,
 * based on each receipt's purchase_date. */
export function monthComparison(receipts: Receipt[]): {
  thisMonthLabel: string;
  lastMonthLabel: string;
  thisMonthTotal: number;
  lastMonthTotal: number;
} {
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

  let thisMonthTotal = 0;
  let lastMonthTotal = 0;
  for (const r of receipts) {
    if (r.total == null || !r.purchase_date) continue;
    const key = r.purchase_date.slice(0, 7); // "YYYY-MM"
    if (key === thisMonthKey) thisMonthTotal += r.total;
    else if (key === lastMonthKey) lastMonthTotal += r.total;
  }

  return {
    thisMonthLabel: monthFormatter.format(now),
    lastMonthLabel: monthFormatter.format(lastMonthDate),
    thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
    lastMonthTotal: Math.round(lastMonthTotal * 100) / 100,
  };
}

export function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="h-56 flex items-center justify-center text-sm text-[var(--color-ink-soft)]">
      {message}
    </div>
  );
}
