"use client";

import { FormEvent, useEffect, useState } from "react";
import { useFinanceStore } from "@/lib/store";
import { answerQuestion } from "@/lib/chatEngine";
import {
  categoryBreakdown,
  categoryMonthlyTrends,
  detectDuplicateCharges,
  detectLargeTransactions,
  detectRecurringCharges,
  monthlyTotals,
  summary,
} from "@/lib/analysis";
import { Transaction } from "@/lib/types";

interface Message {
  id: number;
  role: "user" | "agent";
  text: string;
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
}

const SUGGESTIONS = [
  "На что я чаще всего трачу деньги?",
  "Какие у меня регулярные платежи?",
  "Есть ли что-то подозрительное в тратах?",
  "Какой у меня баланс?",
];

let msgCounter = 0;
const THREADS_STORAGE_KEY = "finance-agent:chat-threads";
const LEGACY_STORAGE_KEY = "finance-agent:chat-messages"; // однопоточный чат из прошлой версии

function greeting(): Message {
  return {
    id: msgCounter++,
    role: "agent",
    text: "Привет! Загрузите данные и спрашивайте про свои траты — например, «на что я чаще всего трачу деньги».",
  };
}

function newThread(): Thread {
  return { id: "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), title: "Новый чат", messages: [greeting()] };
}

function deriveTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "Новый чат";
  return firstUser.text.length > 36 ? firstUser.text.slice(0, 36) + "…" : firstUser.text;
}

function buildContext(transactions: Transaction[], dateFrom: string, dateTo: string) {
  return {
    period: { from: dateFrom || null, to: dateTo || null },
    summary: summary(transactions),
    categories: categoryBreakdown(transactions),
    months: monthlyTotals(transactions),
    categoryTrends: categoryMonthlyTrends(transactions),
    recurringCharges: detectRecurringCharges(transactions),
    duplicateCharges: detectDuplicateCharges(transactions),
    largeTransactions: detectLargeTransactions(transactions),
  };
}

export function ChatPanel() {
  const { filteredTransactions, dateFrom, dateTo, hasData } = useFinanceStore();
  const [threads, setThreads] = useState<Thread[]>(() => [newThread()]);
  const [activeId, setActiveId] = useState<string>(() => threads[0].id);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [aiStatus, setAiStatus] = useState<"unknown" | "online" | "offline">("unknown");
  const [hydrated, setHydrated] = useState(false);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];
  const messages = active.messages;

  // Чаты хранятся только в браузере пользователя (localStorage) — сервер их не видит.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(THREADS_STORAGE_KEY);
      if (raw) {
        const saved: { activeId: string; threads: Thread[] } = JSON.parse(raw);
        if (saved.threads?.length) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage after mount, not SSR-safe as a lazy initializer
          setThreads(saved.threads);
          setActiveId(saved.activeId);
          const allIds = saved.threads.flatMap((t) => t.messages.map((m) => m.id));
          msgCounter = allIds.length ? Math.max(...allIds) + 1 : 0;
        }
      } else {
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          const legacyMessages: Message[] = JSON.parse(legacyRaw);
          if (legacyMessages.length) {
            const migrated: Thread = { id: "t" + Date.now().toString(36), title: deriveTitle(legacyMessages), messages: legacyMessages };
            setThreads([migrated]);
            setActiveId(migrated.id);
            msgCounter = Math.max(...legacyMessages.map((m) => m.id)) + 1;
            localStorage.removeItem(LEGACY_STORAGE_KEY);
          }
        }
      }
    } catch {
      // игнорируем повреждённые данные в localStorage
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify({ activeId, threads }));
    } catch {
      // localStorage может быть недоступен — не критично
    }
  }, [threads, activeId, hydrated]);

  function updateActiveMessages(updater: (msgs: Message[]) => Message[]) {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== activeId) return t;
        const messages = updater(t.messages);
        const title = t.title === "Новый чат" ? deriveTitle(messages) : t.title;
        return { ...t, messages, title };
      })
    );
  }

  function handleNewChat() {
    const t = newThread();
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
  }

  function handleDeleteThread(id: string) {
    setThreads((prev) => {
      const rest = prev.filter((t) => t.id !== id);
      if (rest.length === 0) {
        const t = newThread();
        setActiveId(t.id);
        return [t];
      }
      if (id === activeId) setActiveId(rest[0].id);
      return rest;
    });
  }

  function clearActiveChat() {
    updateActiveMessages(() => [greeting()]);
  }

  async function send(text: string) {
    if (!text.trim() || isThinking) return;
    const userMsg: Message = { id: msgCounter++, role: "user", text };
    updateActiveMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setIsThinking(true);

    try {
      const history = messages
        .filter((m) => m.id !== 0 || messages.length > 1)
        .map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), text: m.text }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history, context: buildContext(filteredTransactions, dateFrom, dateTo) }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiStatus("online");
        updateActiveMessages((msgs) => [...msgs, { id: msgCounter++, role: "agent", text: data.answer || "…" }]);
      } else {
        setAiStatus("offline");
        updateActiveMessages((msgs) => [...msgs, { id: msgCounter++, role: "agent", text: answerQuestion(text, filteredTransactions) }]);
      }
    } catch {
      setAiStatus("offline");
      updateActiveMessages((msgs) => [...msgs, { id: msgCounter++, role: "agent", text: answerQuestion(text, filteredTransactions) }]);
    } finally {
      setIsThinking(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 flex h-[560px] overflow-hidden">
      <div className="w-56 shrink-0 border-r border-black/10 dark:border-white/10 flex flex-col">
        <div className="p-3 border-b border-black/10 dark:border-white/10">
          <button
            onClick={handleNewChat}
            className="w-full px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90"
          >
            + Новый чат
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.map((t) => (
            <div
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm cursor-pointer ${
                t.id === activeId ? "bg-black/10 dark:bg-white/15 font-medium" : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              <span className="flex-1 truncate">{t.title}</span>
              {threads.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteThread(t.id);
                  }}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-600 text-xs px-1 shrink-0"
                  title="Удалить чат"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{active.title === "Новый чат" ? "Чат с агентом" : active.title}</h3>
            <p className="text-xs opacity-60">
              {aiStatus === "online"
                ? "Отвечает Claude на основе ваших данных."
                : aiStatus === "offline"
                  ? "ИИ недоступен (нет ключа на сервере) — базовый режим по шаблонам."
                  : "Отвечает Claude, если на сервере настроен ANTHROPIC_API_KEY — иначе базовый режим по шаблонам."}
            </p>
            {(dateFrom || dateTo) && (
              <p className="text-xs opacity-60 mt-0.5">
                Период: {dateFrom || "начало"} — {dateTo || "конец"} (фильтр задан на вкладке «Дашборд»)
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[11px] px-2 py-1 rounded-full font-medium ${
                aiStatus === "online"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  : aiStatus === "offline"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60"
              }`}
            >
              {aiStatus === "online" ? "ИИ активен" : aiStatus === "offline" ? "Базовый режим" : "—"}
            </span>
            {messages.length > 1 && (
              <button
                onClick={clearActiveChat}
                className="text-[11px] px-2 py-1 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Очистить чат
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-line ${
                  m.role === "user"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "bg-black/5 dark:bg-white/10"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-black/5 dark:bg-white/10 opacity-60">
                печатает…
              </div>
            </div>
          )}
        </div>

        {hasData && messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-3 border-t border-black/10 dark:border-white/10 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спросите про свои траты..."
            className="flex-1 rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:focus:border-white/40"
          />
          <button
            type="submit"
            disabled={isThinking}
            className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
}
