import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Receipt } from "../../api/types";
import { spendByCategory, formatCurrency, TOOLTIP_STYLE, EmptyChartState, CHART_PALETTE } from "./shared";

export function CategoryDonutChart({ receipts }: { receipts: Receipt[] }) {
  const data = spendByCategory(receipts);

  if (data.length === 0) {
    return <EmptyChartState message="No spending data yet — upload a receipt to see it here." />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} stroke="var(--color-paper-raised)" />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => (typeof value === "number" ? formatCurrency(value) : value)}
          contentStyle={TOOLTIP_STYLE}
        />
        <Legend
          verticalAlign="middle"
          align="right"
          layout="vertical"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "var(--color-ink-soft)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
