"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Transaction } from "./types";

interface FinanceStore {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  dateFilteredTransactions: Transaction[]; // фильтр по датам, без фильтра по счёту — для разбивки по счетам
  hasData: boolean;
  loadTransactions: (txs: Transaction[]) => void;
  clearTransactions: () => void;
  dateFrom: string; // ISO yyyy-mm-dd, "" = без ограничения снизу
  dateTo: string; // ISO yyyy-mm-dd, "" = без ограничения сверху
  setDateRange: (from: string, to: string) => void;
  availableRange: { min: string; max: string } | null;
  accountFilter: string | null; // null = все счета
  setAccountFilter: (accountId: string | null) => void;
  availableAccounts: string[];
}

const FinanceContext = createContext<FinanceStore | null>(null);

const STORAGE_KEY = "finance-agent:transactions";

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [accountFilter, setAccountFilter] = useState<string | null>(null);

  // Данные хранятся только в браузере пользователя (localStorage) —
  // ничего не отправляется на сервер, это принципиально для конфиденциальности.
  // Читаем localStorage только после монтирования (не при SSR), поэтому
  // намеренно синхронизируем состояние из эффекта, а не из lazy-инициализатора.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount, not SSR-safe as a lazy initializer
      if (raw) setTransactions(JSON.parse(raw));
    } catch {
      // игнорируем повреждённые данные в localStorage
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch {
      // localStorage может быть недоступен (приватный режим) — не критично
    }
  }, [transactions, hydrated]);

  const availableRange = useMemo(() => {
    if (transactions.length === 0) return null;
    let min = transactions[0].date;
    let max = transactions[0].date;
    for (const t of transactions) {
      if (t.date < min) min = t.date;
      if (t.date > max) max = t.date;
    }
    return { min, max };
  }, [transactions]);

  const availableAccounts = useMemo(() => {
    return [...new Set(transactions.map((t) => t.accountId))].sort();
  }, [transactions]);

  const dateFilteredTransactions = useMemo(() => {
    return transactions.filter((t) => (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo));
  }, [transactions, dateFrom, dateTo]);

  const filteredTransactions = useMemo(() => {
    return dateFilteredTransactions.filter((t) => !accountFilter || t.accountId === accountFilter);
  }, [dateFilteredTransactions, accountFilter]);

  const value = useMemo<FinanceStore>(
    () => ({
      transactions,
      filteredTransactions,
      dateFilteredTransactions,
      hasData: transactions.length > 0,
      loadTransactions: (txs) => setTransactions(txs),
      clearTransactions: () => {
        setTransactions([]);
        setDateFrom("");
        setDateTo("");
        setAccountFilter(null);
      },
      dateFrom,
      dateTo,
      setDateRange: (from, to) => {
        setDateFrom(from);
        setDateTo(to);
      },
      availableRange,
      accountFilter,
      setAccountFilter,
      availableAccounts,
    }),
    [
      transactions,
      filteredTransactions,
      dateFilteredTransactions,
      dateFrom,
      dateTo,
      availableRange,
      accountFilter,
      availableAccounts,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinanceStore() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinanceStore must be used within FinanceProvider");
  return ctx;
}
