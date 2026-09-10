"use client";

import { useFinanceStore } from "@/lib/store";
import { transactionsToCsv } from "@/lib/csv";

export function ExportButtons() {
  const { filteredTransactions } = useFinanceStore();

  function downloadCsv() {
    const csv = transactionsToCsv(filteredTransactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "otchet-operatsii.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        onClick={downloadCsv}
        className="text-xs px-3 py-1.5 rounded-full border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
      >
        Экспорт операций (CSV)
      </button>
      <button
        onClick={() => window.print()}
        className="text-xs px-3 py-1.5 rounded-full border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
      >
        Печать / Сохранить как PDF
      </button>
    </div>
  );
}
