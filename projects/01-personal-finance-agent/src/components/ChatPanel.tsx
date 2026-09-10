"use client";

import { FormEvent, useState } from "react";
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

const SUGGESTIONS = [
  "На что я чаще всего трачу деньги?",
  "Какие у меня регулярные платежи?",
  "Есть ли что-то подозрительное в тратах?",
  "Какой у меня баланс?",
];

let msgCounter = 0;

function buildContext(transactions: Transaction[]) {
  return {
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
  const { transactions, hasData } = useFinanceStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: msgCounter++,
      role: "agent",
      text: "Привет! Загрузите данные и спрашивайте про свои траты — например, «на что я чаще всего трачу деньги».",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [aiStatus, setAiStatus] = useState<"unknown" | "online" | "offline">("unknown");

  async function send(text: string) {
    if (!text.trim() || isThinking) return;
    const userMsg: Message = { id: msgCounter++, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    try {
      const history = messages
        .filter((m) => m.id !== 0 || messages.length > 1)
        .map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), text: m.text }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history, context: buildContext(transactions) }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiStatus("online");
        setMessages((prev) => [...prev, { id: msgCounter++, role: "agent", text: data.answer || "…" }]);
      } else {
        setAiStatus("offline");
        setMessages((prev) => [...prev, { id: msgCounter++, role: "agent", text: answerQuestion(text, transactions) }]);
      }
    } catch {
      setAiStatus("offline");
      setMessages((prev) => [...prev, { id: msgCounter++, role: "agent", text: answerQuestion(text, transactions) }]);
    } finally {
      setIsThinking(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 flex flex-col h-[520px]">
      <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Чат с агентом</h3>
          <p className="text-xs opacity-60">
            {aiStatus === "online"
              ? "Отвечает Claude на основе ваших данных."
              : aiStatus === "offline"
                ? "ИИ недоступен (нет ключа на сервере) — базовый режим по шаблонам."
                : "Отвечает Claude, если на сервере настроен ANTHROPIC_API_KEY — иначе базовый режим по шаблонам."}
          </p>
        </div>
        <span
          className={`shrink-0 text-[11px] px-2 py-1 rounded-full font-medium ${
            aiStatus === "online"
              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
              : aiStatus === "offline"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60"
          }`}
        >
          {aiStatus === "online" ? "ИИ активен" : aiStatus === "offline" ? "Базовый режим" : "—"}
        </span>
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
  );
}
