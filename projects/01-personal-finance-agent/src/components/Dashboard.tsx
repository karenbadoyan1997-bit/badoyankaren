"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/lib/store";
import { categoryBreakdown, generateInsights, monthlyTotals, summary } from "@/lib/analysis";
import { StatTiles } from "./StatTiles";
import { CategoryBreakdownChart } from "./CategoryBreakdownChart";
import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { InsightsList } from "./InsightsList";
import { DateRangeFilter } from "./DateRangeFilter";

export function Dashboard() {
  const { hasData, filteredTransactions } = useFinanceStore();

  const stats = useMemo(() => summary(filteredTransactions), [filteredTransactions]);
  const categories = useMemo(() => categoryBreakdown(filteredTransactions), [filteredTransactions]);
  const months = useMemo(() => monthlyTotals(filteredTransactions), [filteredTransactions]);
  const insights = useMemo(() => generateInsights(filteredTransactions), [filteredTransactions]);

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-black/20 dark:border-white/20 p-10 text-center text-sm opacity-60">
        Загрузите выписку или синтетические данные, чтобы увидеть аналитику.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DateRangeFilter />
      {filteredTransactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 dark:border-white/20 p-10 text-center text-sm opacity-60">
          За выбранный период нет операций — попробуйте расширить диапазон дат.
        </div>
      ) : (
        <>
          <StatTiles {...stats} />
          <div className="grid md:grid-cols-2 gap-6">
            <CategoryBreakdownChart data={categories} />
            <MonthlyTrendChart data={months} />
          </div>
          <InsightsList insights={insights} />
        </>
      )}
    </div>
  );
}
