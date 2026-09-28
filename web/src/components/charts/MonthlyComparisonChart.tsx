import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Receipt } from "../../api/types";
import { monthComparison, formatCurrency, formatCompact, TOOLTIP_STYLE, EmptyChartState, CHART_PALETTE } from "./shared";

export function MonthlyComparisonChart({ receipts }: { receipts: Receipt[] }) {
  const { thisMonthLabel, lastMonthLabel, thisMonthTotal, lastMonthTotal } = monthComparison(receipts);

  if (thisMonthTotal === 0 && lastMonthTotal === 0) {
    return (
      <EmptyChartState message="No receipts dated this month or last. They'll compare here once you have some." />
    );
  }

  const data = [
    { label: lastMonthLabel, total: lastMonthTotal },
    { label: thisMonthLabel, total: thisMonthTotal },
  ];

  const delta = thisMonthTotal - lastMonthTotal;
  const deltaLabel =
    lastMonthTotal === 0
      ? null
      : `${delta >= 0 ? "+" : ""}${((delta / lastMonthTotal) * 100).toFixed(0)}% vs last month`;

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "var(--color-ink-soft)" }}
            axisLine={{ stroke: "var(--color-line)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--color-ink-soft)" }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={formatCompact}
          />
          <Tooltip
            formatter={(value) => (typeof value === "number" ? formatCurrency(value) : value)}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={64}>
            <Cell fill={CHART_PALETTE[5]} />
            <Cell fill={CHART_PALETTE[0]} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {deltaLabel && (
        <p
          className={`text-sm font-mono mt-1 text-center ${
            delta > 0 ? "text-amber-600" : delta < 0 ? "text-emerald-600" : "text-[var(--color-ink-soft)]"
          }`}
        >
          {deltaLabel}
        </p>
      )}
    </div>
  );
}
