"use client";

import { useEffect, useState } from "react";
import { Insight } from "@/lib/types";

const SEVERITY_STYLE: Record<Insight["severity"], { icon: string; classes: string; label: string }> = {
  info: { icon: "ℹ️", classes: "border-black/10 dark:border-white/10", label: "Инфо" },
  notice: { icon: "⚠️", classes: "border-[#fab219]/50", label: "Заметно" },
  warning: { icon: "🚨", classes: "border-[#d03b3b]/60", label: "Требует внимания" },
};

const DISMISSED_STORAGE_KEY = "finance-agent:dismissed-insights";

export function InsightsList({ insights }: { insights: Insight[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount, not SSR-safe as a lazy initializer
      if (raw) setDismissed(JSON.parse(raw));
    } catch {
      // игнорируем повреждённые данные
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(dismissed));
    } catch {
      // не критично
    }
  }, [dismissed, hydrated]);

  function dismiss(id: string) {
    setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }
  function restore(id: string) {
    setDismissed((prev) => prev.filter((x) => x !== id));
  }

  const visible = insights.filter((i) => !dismissed.includes(i.id));
  const hidden = insights.filter((i) => dismissed.includes(i.id));

  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 text-sm opacity-70">
        Пока не найдено заметных паттернов — загрузите больше данных за несколько месяцев.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Найденные паттерны</h3>
        {hidden.length > 0 && (
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="text-xs opacity-60 hover:opacity-100 underline"
          >
            {showHidden ? "Скрыть просмотренные" : `Показать скрытые (${hidden.length})`}
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm opacity-60">Все найденные паттерны просмотрены и скрыты.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((ins) => {
            const style = SEVERITY_STYLE[ins.severity];
            return (
              <div key={ins.id} className={`rounded-xl border p-4 ${style.classes}`}>
                <div className="flex items-center gap-2 text-sm">
                  <span aria-hidden>{style.icon}</span>
                  <span className="font-medium">{ins.title}</span>
                  <span className="ml-auto text-xs opacity-50">{style.label}</span>
                  <button
                    onClick={() => dismiss(ins.id)}
                    title="Отметить как просмотрено и скрыть"
                    className="text-xs opacity-40 hover:opacity-100 hover:text-red-600 px-1"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm opacity-70 mt-1">{ins.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {showHidden && hidden.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t border-black/10 dark:border-white/10">
          {hidden.map((ins) => (
            <div key={ins.id} className="rounded-xl border border-black/10 dark:border-white/10 p-3 opacity-50">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{ins.title}</span>
                <button
                  onClick={() => restore(ins.id)}
                  className="ml-auto text-xs underline opacity-100 hover:no-underline"
                >
                  Вернуть
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
