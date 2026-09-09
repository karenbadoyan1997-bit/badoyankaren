"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/lib/store";
import { categoryBreakdown, generateInsights, monthlyTotals, summary } from "@/lib/analysis";
import { StatTiles } from "./StatTiles";
import { CategoryBreakdownChart } from "./CategoryBreakdownChart";
import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { InsightsList } from "./InsightsList";

export function Dashboard() {
  const { transactions, hasData } = useFinanceStore();

  const stats = useMemo(() => summary(transactions), [transactions]);
  const categories = useMemo(() => categoryBreakdown(transactions), [transactions]);
  const months = useMemo(() => monthlyTotals(transactions), [transactions]);
  const insights = useMemo(() => generateInsights(transactions), [transactions]);

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-black/20 dark:border-white/20 p-10 text-center text-sm opacity-60">
        Загрузите выписку или синтетические данные, чтобы увидеть аналитику.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatTiles {...stats} />
      <div className="grid md:grid-cols-2 gap-6">
        <CategoryBreakdownChart data={categories} />
        <MonthlyTrendChart data={months} />
      </div>
      <InsightsList insights={insights} />
    </div>
  );
}
