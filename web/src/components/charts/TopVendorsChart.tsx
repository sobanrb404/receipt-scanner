import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Receipt } from "../../api/types";
import { topVendors, formatCurrency, TOOLTIP_STYLE, EmptyChartState, CHART_PALETTE } from "./shared";

export function TopVendorsChart({ receipts }: { receipts: Receipt[] }) {
  const data = topVendors(receipts, 5);

  if (data.length === 0) {
    return <EmptyChartState message="No vendors yet — they'll rank here once you've uploaded a few receipts." />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "var(--color-ink-soft)" }}
          axisLine={{ stroke: "var(--color-line)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="vendor"
          tick={{ fontSize: 12, fill: "var(--color-ink-soft)" }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          formatter={(value) => (typeof value === "number" ? formatCurrency(value) : value)}
          contentStyle={TOOLTIP_STYLE}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
