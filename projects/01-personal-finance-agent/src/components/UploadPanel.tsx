"use client";

import { DragEvent, useRef, useState } from "react";
import { parseTransactionsCsv, transactionsToCsv } from "@/lib/csv";
import { generateSyntheticTransactions } from "@/lib/synthetic";
import { useFinanceStore } from "@/lib/store";

interface Source {
  name: string;
  count: number;
}

const ACCEPTED_EXTENSIONS = [".csv"];

export function UploadPanel() {
  const { transactions, loadTransactions, clearTransactions, hasData } = useFinanceStore();
  const [sources, setSources] = useState<Source[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastSyntheticCount, setLastSyntheticCount] = useState<number | null>(null);
  const [totalSyntheticGenerated, setTotalSyntheticGenerated] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function isAccepted(file: File) {
    const name = file.name.toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  }

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const rejected = list.filter((f) => !isAccepted(f));
    const accepted = list.filter(isAccepted);

    const newErrors: string[] = rejected.map(
      (f) => `«${f.name}»: неподдерживаемый тип файла — сейчас принимаются только .csv`
    );
    const newSources: Source[] = [];
    let merged = transactions;

    for (const file of accepted) {
      const text = await file.text();
      const { transactions: parsed, errors: parseErrors } = parseTransactionsCsv(text);
      newErrors.push(...parseErrors.map((e) => `«${file.name}» — ${e}`));
      if (parsed.length > 0) {
        merged = [...merged, ...parsed];
        newSources.push({ name: file.name, count: parsed.length });
      }
    }

    if (newSources.length > 0) loadTransactions(merged);
    setSources((prev) => [...prev, ...newSources]);
    setErrors(newErrors);
  }

  function handleDemoData() {
    setErrors([]);
    const demo = generateSyntheticTransactions(6);
    setSources([{ name: "синтетические данные (демо)", count: demo.length }]);
    setLastSyntheticCount(demo.length);
    setTotalSyntheticGenerated((prev) => prev + demo.length);
    loadTransactions(demo);
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

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Загрузка выписок</h2>
        <p className="text-sm opacity-70">
          Данные остаются только в вашем браузере — никуда не отправляются. Можно приложить сразу несколько
          файлов (например, по одному на счёт) — они объединятся в один набор данных.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          isDragOver
            ? "border-black bg-black/5 dark:border-white dark:bg-white/10"
            : "border-black/20 dark:border-white/20 hover:bg-black/[.02] dark:hover:bg-white/[.04]"
        }`}
      >
        <p className="text-sm font-medium">Перетащите файлы сюда или нажмите, чтобы выбрать</p>
        <p className="text-xs opacity-60 mt-1">Поддерживаемый тип файла: CSV (.csv)</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleDemoData}
          className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90"
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
              setSources([]);
              setErrors([]);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Очистить данные
          </button>
        )}
      </div>

      {lastSyntheticCount !== null && (
        <div className="text-sm space-y-0.5">
          <p>Загружено {lastSyntheticCount} операций (синтетика).</p>
          <p className="opacity-60 text-xs">
            Всего сгенерировано синтетических операций за эту сессию: {totalSyntheticGenerated}.
          </p>
        </div>
      )}

      {sources.length > 0 && (
        <div className="text-sm space-y-1">
          <p className="font-medium">Загруженные источники:</p>
          <ul className="opacity-80">
            {sources.map((s, i) => (
              <li key={i}>
                {s.name} — {s.count} операций
              </li>
            ))}
          </ul>
        </div>
      )}

      {errors.length > 0 && (
        <div className="text-sm text-amber-700 dark:text-amber-400">
          <p className="font-medium">Замечания при разборе ({errors.length}):</p>
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
