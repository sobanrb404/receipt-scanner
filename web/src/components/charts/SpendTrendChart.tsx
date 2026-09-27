import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Receipt } from "../../api/types";
import { spendByDay, formatCurrency, TOOLTIP_STYLE, EmptyChartState } from "./shared";

export function SpendTrendChart({ receipts }: { receipts: Receipt[] }) {
  const data = spendByDay(receipts);

  if (data.length === 0) {
    return <EmptyChartState message="No dated receipts yet — spend will chart here once you have some." />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-teal)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-teal)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
          axisLine={{ stroke: "var(--color-line)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--color-ink-soft)" }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          formatter={(value) => (typeof value === "number" ? formatCurrency(value) : value)}
          contentStyle={TOOLTIP_STYLE}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="var(--color-teal)"
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={{ r: 3, fill: "var(--color-teal)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
