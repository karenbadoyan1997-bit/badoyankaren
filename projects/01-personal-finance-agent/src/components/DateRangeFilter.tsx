"use client";

import { useFinanceStore } from "@/lib/store";

const PRESETS: { label: string; months: number | "all" }[] = [
  { label: "1 мес", months: 1 },
  { label: "3 мес", months: 3 },
  { label: "6 мес", months: 6 },
  { label: "Всё время", months: "all" },
];

function monthsAgoISO(months: number, maxDate: string) {
  const d = new Date(maxDate);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export function DateRangeFilter() {
  const {
    dateFrom,
    dateTo,
    setDateRange,
    availableRange,
    filteredTransactions,
    accountFilter,
    setAccountFilter,
    availableAccounts,
  } = useFinanceStore();

  if (!availableRange) return null;

  const isActive = Boolean(dateFrom || dateTo || accountFilter);

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="dateFrom" className="text-xs opacity-60">
          С
        </label>
        <input
          id="dateFrom"
          type="date"
          value={dateFrom}
          min={availableRange.min}
          max={dateTo || availableRange.max}
          onChange={(e) => setDateRange(e.target.value, dateTo)}
          className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/40 dark:focus:border-white/40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="dateTo" className="text-xs opacity-60">
          По
        </label>
        <input
          id="dateTo"
          type="date"
          value={dateTo}
          min={dateFrom || availableRange.min}
          max={availableRange.max}
          onChange={(e) => setDateRange(dateFrom, e.target.value)}
          className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/40 dark:focus:border-white/40"
        />
      </div>

      {availableAccounts.length > 1 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="accountFilter" className="text-xs opacity-60">
            Счёт
          </label>
          <select
            id="accountFilter"
            value={accountFilter ?? ""}
            onChange={(e) => setAccountFilter(e.target.value || null)}
            className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/40 dark:focus:border-white/40 dark:[color-scheme:dark]"
          >
            <option value="">Все счета</option>
            {availableAccounts.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() =>
              setDateRange(p.months === "all" ? "" : monthsAgoISO(p.months, availableRange.max), "")
            }
            className="text-xs px-3 py-1.5 rounded-full border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {p.label}
          </button>
        ))}
      </div>

      {isActive && (
        <button
          onClick={() => {
            setDateRange("", "");
            setAccountFilter(null);
          }}
          className="text-xs px-3 py-1.5 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          Сбросить
        </button>
      )}

      <span className="text-xs opacity-50 ml-auto">
        {filteredTransactions.length} операций {isActive ? "за выбранный фильтр" : "всего"}
      </span>
    </div>
  );
}
