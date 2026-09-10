"use client";

import { useMemo, useState } from "react";
import { useFinanceStore } from "@/lib/store";
import { categoryBreakdown, formatAmd, summary } from "@/lib/analysis";
import { Category, Transaction } from "@/lib/types";

function filterByRange(transactions: Transaction[], from: string, to: string) {
  return transactions.filter((t) => (!from || t.date >= from) && (!to || t.date <= to));
}

function shiftRangeBack(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
  return { from: prevStart.toISOString().slice(0, 10), to: prevEnd.toISOString().slice(0, 10) };
}

function deltaPercent(a: number, b: number) {
  if (a === 0) return b === 0 ? 0 : 100;
  return Math.round(((b - a) / a) * 100);
}

export function PeriodComparison() {
  const { transactions, availableRange } = useFinanceStore();
  const [expanded, setExpanded] = useState(false);
  const [aFrom, setAFrom] = useState("");
  const [aTo, setATo] = useState("");
  const [bFrom, setBFrom] = useState("");
  const [bTo, setBTo] = useState("");

  const periodA = useMemo(() => filterByRange(transactions, aFrom, aTo), [transactions, aFrom, aTo]);
  const periodB = useMemo(() => filterByRange(transactions, bFrom, bTo), [transactions, bFrom, bTo]);

  const summaryA = useMemo(() => summary(periodA), [periodA]);
  const summaryB = useMemo(() => summary(periodB), [periodB]);
  const catA = useMemo(() => categoryBreakdown(periodA), [periodA]);
  const catB = useMemo(() => categoryBreakdown(periodB), [periodB]);

  if (!availableRange) return null;

  function usePreviousAsB() {
    if (!aFrom || !aTo) return;
    const prev = shiftRangeBack(aFrom, aTo);
    setBFrom(prev.from);
    setBTo(prev.to);
  }

  const allCategories = [...new Set([...catA.map((c) => c.category), ...catB.map((c) => c.category)])] as Category[];
  const catAMap = new Map(catA.map((c) => [c.category, c.total]));
  const catBMap = new Map(catB.map((c) => [c.category, c.total]));

  const readyToCompare = Boolean(aFrom && aTo && bFrom && bTo);

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="font-semibold">Сравнение периодов</h3>
        <span className="text-xs opacity-60">{expanded ? "Свернуть ▲" : "Развернуть ▼"}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium opacity-70">Период А</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={aFrom}
                  min={availableRange.min}
                  max={availableRange.max}
                  onChange={(e) => setAFrom(e.target.value)}
                  className="flex-1 rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-2 py-1.5 text-sm outline-none"
                />
                <input
                  type="date"
                  value={aTo}
                  min={availableRange.min}
                  max={availableRange.max}
                  onChange={(e) => setATo(e.target.value)}
                  className="flex-1 rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-2 py-1.5 text-sm outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium opacity-70">Период Б</p>
                <button onClick={usePreviousAsB} className="text-xs underline opacity-60 hover:opacity-100">
                  Взять предыдущий такой же
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={bFrom}
                  min={availableRange.min}
                  max={availableRange.max}
                  onChange={(e) => setBFrom(e.target.value)}
                  className="flex-1 rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-2 py-1.5 text-sm outline-none"
                />
                <input
                  type="date"
                  value={bTo}
                  min={availableRange.min}
                  max={availableRange.max}
                  onChange={(e) => setBTo(e.target.value)}
                  className="flex-1 rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-2 py-1.5 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          {readyToCompare && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left opacity-60 text-xs">
                    <th className="py-1 pr-3 font-medium"> </th>
                    <th className="py-1 pr-3 font-medium">Период А</th>
                    <th className="py-1 pr-3 font-medium">Период Б</th>
                    <th className="py-1 font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-black/10 dark:border-white/10">
                    <td className="py-1.5 pr-3">Расходы</td>
                    <td className="py-1.5 pr-3">{formatAmd(summaryA.totalExpenses)}</td>
                    <td className="py-1.5 pr-3">{formatAmd(summaryB.totalExpenses)}</td>
                    <td
                      className={`py-1.5 font-medium ${
                        summaryB.totalExpenses > summaryA.totalExpenses ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {deltaPercent(summaryA.totalExpenses, summaryB.totalExpenses) > 0 ? "+" : ""}
                      {deltaPercent(summaryA.totalExpenses, summaryB.totalExpenses)}%
                    </td>
                  </tr>
                  <tr className="border-t border-black/10 dark:border-white/10">
                    <td className="py-1.5 pr-3">Доходы</td>
                    <td className="py-1.5 pr-3">{formatAmd(summaryA.totalIncome)}</td>
                    <td className="py-1.5 pr-3">{formatAmd(summaryB.totalIncome)}</td>
                    <td
                      className={`py-1.5 font-medium ${
                        summaryB.totalIncome >= summaryA.totalIncome ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {deltaPercent(summaryA.totalIncome, summaryB.totalIncome) > 0 ? "+" : ""}
                      {deltaPercent(summaryA.totalIncome, summaryB.totalIncome)}%
                    </td>
                  </tr>
                  <tr className="border-t border-black/10 dark:border-white/10 font-medium">
                    <td className="py-1.5 pr-3">Баланс</td>
                    <td className="py-1.5 pr-3">{formatAmd(summaryA.net)}</td>
                    <td className="py-1.5 pr-3">{formatAmd(summaryB.net)}</td>
                    <td> </td>
                  </tr>

                  {allCategories.length > 0 && (
                    <tr>
                      <td colSpan={4} className="pt-4 pb-1 text-xs font-medium opacity-70">
                        По категориям
                      </td>
                    </tr>
                  )}
                  {allCategories
                    .map((cat) => ({
                      cat,
                      a: catAMap.get(cat) ?? 0,
                      b: catBMap.get(cat) ?? 0,
                    }))
                    .sort((x, y) => y.a + y.b - (x.a + x.b))
                    .map(({ cat, a, b }) => (
                      <tr key={cat} className="border-t border-black/10 dark:border-white/10">
                        <td className="py-1.5 pr-3">{cat}</td>
                        <td className="py-1.5 pr-3">{formatAmd(a)}</td>
                        <td className="py-1.5 pr-3">{formatAmd(b)}</td>
                        <td className={`py-1.5 font-medium ${b > a ? "text-red-600" : "text-green-600"}`}>
                          {deltaPercent(a, b) > 0 ? "+" : ""}
                          {deltaPercent(a, b)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {!readyToCompare && (
            <p className="text-sm opacity-60">Задайте даты для обоих периодов, чтобы увидеть сравнение.</p>
          )}
        </div>
      )}
    </div>
  );
}
