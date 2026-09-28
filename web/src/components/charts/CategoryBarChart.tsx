import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Receipt } from "../../api/types";
import { spendByCategory, formatCurrency, formatCompact, TOOLTIP_STYLE, EmptyChartState } from "./shared";

export function CategoryBarChart({ receipts }: { receipts: Receipt[] }) {
  const data = spendByCategory(receipts);

  if (data.length === 0) {
    return <EmptyChartState message="No spending data yet. Upload a receipt to see it here." />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis
          dataKey="category"
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
        <Bar dataKey="total" fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
