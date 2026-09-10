"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MonthlyTotal, formatAmd } from "@/lib/analysis";
import { usePalette } from "@/lib/palette";

export function MonthlyTrendChart({ data }: { data: MonthlyTotal[] }) {
  const p = usePalette();

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
      <h3 className="font-semibold mb-1">Доходы и расходы по месяцам</h3>
      <p className="text-sm opacity-70 mb-4">Помогает увидеть тренд — растут ли траты быстрее дохода</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ left: 8, right: 24, top: 8 }}>
          <CartesianGrid stroke={p.grid} vertical={false} />
          <XAxis dataKey="month" stroke={p.axis} tick={{ fill: p.muted, fontSize: 12 }} />
          <YAxis tickFormatter={(v) => formatAmd(v)} stroke={p.axis} tick={{ fill: p.muted, fontSize: 12 }} width={90} />
          <Tooltip
            formatter={(value) => formatAmd(Number(value))}
            contentStyle={{ background: p.surface, border: `1px solid ${p.grid}`, borderRadius: 8, color: p.textPrimary }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: p.textSecondary }} />
          <Line type="monotone" dataKey="income" name="Доход" stroke={p.series1} strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="expenses" name="Расходы" stroke={p.series2} strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
