"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/lib/store";
import { accountBreakdown, formatAmd } from "@/lib/analysis";

export function AccountBreakdown() {
  const { dateFilteredTransactions, accountFilter, setAccountFilter, availableAccounts } = useFinanceStore();
  const accounts = useMemo(() => accountBreakdown(dateFilteredTransactions), [dateFilteredTransactions]);

  if (availableAccounts.length <= 1) return null;

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
      <h3 className="font-semibold mb-1">Разбивка по счетам</h3>
      <p className="text-sm opacity-70 mb-4">За выбранный период дат, по всем счетам</p>
      <div className="space-y-2">
        {accounts.map((a) => (
          <button
            key={a.accountId}
            onClick={() => setAccountFilter(accountFilter === a.accountId ? null : a.accountId)}
            className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
              accountFilter === a.accountId
                ? "border-black dark:border-white bg-black/5 dark:bg-white/10"
                : "border-black/10 dark:border-white/10 hover:bg-black/[.02] dark:hover:bg-white/[.04]"
            }`}
          >
            <div>
              <div className="text-sm font-medium">{a.accountId}</div>
              <div className="text-xs opacity-60">{a.transactionCount} операций</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{formatAmd(a.expenses)}</div>
              <div className="text-xs opacity-60">расходы</div>
            </div>
          </button>
        ))}
      </div>
      {accountFilter && (
        <p className="text-xs opacity-60 mt-3">
          Дашборд отфильтрован по счёту «{accountFilter}». Нажмите на счёт ещё раз, чтобы снять фильтр.
        </p>
      )}
    </div>
  );
}
