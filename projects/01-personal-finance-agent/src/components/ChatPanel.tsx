"use client";

import { FormEvent, useState } from "react";
import { useFinanceStore } from "@/lib/store";
import { answerQuestion } from "@/lib/chatEngine";

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

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { id: msgCounter++, role: "user", text };
    const agentMsg: Message = { id: msgCounter++, role: "agent", text: answerQuestion(text, transactions) };
    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setInput("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 flex flex-col h-[520px]">
      <div className="p-4 border-b border-black/10 dark:border-white/10">
        <h3 className="font-semibold">Чат с агентом</h3>
        <p className="text-xs opacity-60">
          MVP-версия отвечает по заготовленным шаблонам на основе ваших данных (без внешнего ИИ).
        </p>
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
          className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:opacity-90"
        >
          Отправить
        </button>
      </form>
    </div>
  );
}
