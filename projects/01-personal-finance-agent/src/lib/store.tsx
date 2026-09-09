"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Transaction } from "./types";

interface FinanceStore {
  transactions: Transaction[];
  hasData: boolean;
  loadTransactions: (txs: Transaction[]) => void;
  clearTransactions: () => void;
}

const FinanceContext = createContext<FinanceStore | null>(null);

const STORAGE_KEY = "finance-agent:transactions";

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);

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

  const value = useMemo<FinanceStore>(
    () => ({
      transactions,
      hasData: transactions.length > 0,
      loadTransactions: (txs) => setTransactions(txs),
      clearTransactions: () => setTransactions([]),
    }),
    [transactions]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinanceStore() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinanceStore must be used within FinanceProvider");
  return ctx;
}
