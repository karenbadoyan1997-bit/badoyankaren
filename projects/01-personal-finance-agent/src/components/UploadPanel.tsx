"use client";

import { useRef, useState } from "react";
import { parseTransactionsCsv, transactionsToCsv } from "@/lib/csv";
import { generateSyntheticTransactions } from "@/lib/synthetic";
import { useFinanceStore } from "@/lib/store";

export function UploadPanel() {
  const { loadTransactions, clearTransactions, hasData, transactions } = useFinanceStore();
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    const { transactions: parsed, errors: parseErrors } = parseTransactionsCsv(text);
    setErrors(parseErrors);
    setFileName(file.name);
    if (parsed.length > 0) loadTransactions(parsed);
  }

  function handleDemoData() {
    setErrors([]);
    setFileName("синтетические данные (демо)");
    loadTransactions(generateSyntheticTransactions(6));
  }

  function handleDownloadSample() {
    const sample = generateSyntheticTransactions(1).slice(0, 15);
    const csv = transactionsToCsv(sample);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-statement.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Загрузка выписок</h2>
        <p className="text-sm opacity-70">
          Данные остаются только в вашем браузере — никуда не отправляются. Формат CSV: date, merchant,
          category, amount, currency, account.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90"
        >
          Загрузить CSV
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={handleDemoData}
          className="px-4 py-2 rounded-lg border border-black/20 dark:border-white/20 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          Использовать синтетические данные
        </button>
        <button
          onClick={handleDownloadSample}
          className="px-4 py-2 rounded-lg border border-black/20 dark:border-white/20 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          Скачать пример CSV
        </button>
        {hasData && (
          <button
            onClick={() => {
              clearTransactions();
              setFileName(null);
              setErrors([]);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Очистить данные
          </button>
        )}
      </div>

      {fileName && (
        <p className="text-sm">
          Источник: <span className="font-medium">{fileName}</span> — загружено {transactions.length} операций.
        </p>
      )}

      {errors.length > 0 && (
        <div className="text-sm text-amber-700 dark:text-amber-400">
          <p className="font-medium">Не удалось распознать {errors.length} строк(и):</p>
          <ul className="list-disc list-inside opacity-80 max-h-24 overflow-auto">
            {errors.slice(0, 10).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
