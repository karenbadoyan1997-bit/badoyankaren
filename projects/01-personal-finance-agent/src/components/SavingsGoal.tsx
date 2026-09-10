"use client";

import { FormEvent, useEffect, useState } from "react";
import { useFinanceStore } from "@/lib/store";
import { formatAmd, summary } from "@/lib/analysis";

interface Goal {
  name: string;
  targetAmount: number;
  targetDate: string; // ISO yyyy-mm-dd
}

const GOAL_STORAGE_KEY = "finance-agent:savings-goal";

function monthsBetween(from: Date, to: Date) {
  return Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

export function SavingsGoal() {
  const { transactions, hasData } = useFinanceStore();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GOAL_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount, not SSR-safe as a lazy initializer
      if (raw) setGoal(JSON.parse(raw));
    } catch {
      // игнорируем повреждённые данные
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (goal) localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(goal));
      else localStorage.removeItem(GOAL_STORAGE_KEY);
    } catch {
      // не критично
    }
  }, [goal, hydrated]);

  if (!hasData) return null;

  function startEditing() {
    setName(goal?.name ?? "");
    setAmount(goal ? String(goal.targetAmount) : "");
    setDate(goal?.targetDate ?? "");
    setEditing(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const targetAmount = Number(amount);
    if (!name.trim() || !targetAmount || targetAmount <= 0 || !date) return;
    setGoal({ name: name.trim(), targetAmount, targetDate: date });
    setEditing(false);
  }

  if (editing || !goal) {
    return (
      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
        <h3 className="font-semibold mb-1">Цель накоплений</h3>
        <p className="text-sm opacity-70 mb-4">Задайте, сколько и к какому сроку хотите накопить.</p>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs opacity-60">Название</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, подушка безопасности"
              className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none w-56"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs opacity-60">Сумма (AMD)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000000"
              className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs opacity-60">Срок</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90"
          >
            {goal ? "Сохранить" : "Создать цель"}
          </button>
          {goal && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium opacity-60 hover:opacity-100"
            >
              Отмена
            </button>
          )}
        </form>
      </div>
    );
  }

  const current = summary(transactions).net;
  const progressPercent = Math.min(100, Math.max(0, (current / goal.targetAmount) * 100));
  const today = new Date();
  const target = new Date(goal.targetDate);
  const daysLeft = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  const remaining = goal.targetAmount - current;
  const monthlyNeeded = remaining > 0 && daysLeft > 0 ? remaining / monthsBetween(today, target) : 0;

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold">{goal.name}</h3>
          <p className="text-sm opacity-70">
            Цель: {formatAmd(goal.targetAmount)} к {goal.targetDate}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={startEditing} className="text-xs underline opacity-60 hover:opacity-100">
            Изменить
          </button>
          <button
            onClick={() => setGoal(null)}
            className="text-xs underline text-red-600 opacity-80 hover:opacity-100"
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="h-3 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${progressPercent >= 100 ? "bg-green-600" : "bg-black dark:bg-white"}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3 text-sm">
        <span>
          Накоплено: <span className="font-medium">{formatAmd(current)}</span> ({Math.round(progressPercent)}%)
        </span>
        {remaining > 0 ? (
          <>
            <span className="opacity-70">Осталось: {formatAmd(remaining)}</span>
            {daysLeft > 0 ? (
              <span className="opacity-70">
                {daysLeft} дн. — нужно откладывать ≈{formatAmd(monthlyNeeded)}/мес
              </span>
            ) : (
              <span className="text-red-600">Срок уже прошёл</span>
            )}
          </>
        ) : (
          <span className="text-green-600 font-medium">Цель достигнута</span>
        )}
      </div>
      <p className="text-xs opacity-50 mt-2">
        «Накоплено» считается как доходы минус расходы по всем загруженным операциям (без учёта фильтров дашборда).
      </p>
    </div>
  );
}
