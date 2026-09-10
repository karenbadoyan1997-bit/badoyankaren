"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CategoryTotal, formatAmd } from "@/lib/analysis";
import { usePalette } from "@/lib/palette";

export function CategoryBreakdownChart({ data }: { data: CategoryTotal[] }) {
  const p = usePalette();
  const top = data.slice(0, 8);

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
      <h3 className="font-semibold mb-1">Траты по категориям</h3>
      <p className="text-sm opacity-70 mb-4">За весь загруженный период</p>
      <ResponsiveContainer width="100%" height={Math.max(220, top.length * 40)}>
        <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid horizontal={false} stroke={p.grid} />
          <XAxis type="number" tickFormatter={(v) => formatAmd(v)} stroke={p.axis} tick={{ fill: p.muted, fontSize: 12 }} />
          <YAxis type="category" dataKey="category" width={140} stroke={p.axis} tick={{ fill: p.textSecondary, fontSize: 12 }} />
          <Tooltip
            formatter={(value) => formatAmd(Number(value))}
            contentStyle={{ background: p.surface, border: `1px solid ${p.grid}`, borderRadius: 8, color: p.textPrimary }}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {top.map((_, i) => (
              <Cell key={i} fill={p.series1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
