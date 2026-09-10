"use client";

import { useState } from "react";
import { FinanceProvider } from "@/lib/store";
import { UploadPanel } from "@/components/UploadPanel";
import { Dashboard } from "@/components/Dashboard";
import { ChatPanel } from "@/components/ChatPanel";

type Tab = "upload" | "dashboard" | "chat";

const TABS: { id: Tab; label: string }[] = [
  { id: "upload", label: "Загрузка" },
  { id: "dashboard", label: "Дашборд" },
  { id: "chat", label: "Чат с агентом" },
];

function AppShell() {
  const [tab, setTab] = useState<Tab>("upload");

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-black/10 dark:border-white/10 px-6 py-4 print:hidden">
        <h1 className="text-xl font-semibold">Персональный финансовый ассистент</h1>
        <p className="text-sm opacity-60">Учебный проект ACA — анализ трат по выпискам, синтетические данные</p>
      </header>

      <nav className="flex gap-1 px-6 pt-4 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
              tab === t.id
                ? "border-black dark:border-white"
                : "border-transparent opacity-50 hover:opacity-80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 px-6 py-6 max-w-5xl w-full mx-auto space-y-6">
        {tab === "upload" && <UploadPanel />}
        {tab === "dashboard" && <Dashboard />}
        {tab === "chat" && <ChatPanel />}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <FinanceProvider>
      <AppShell />
    </FinanceProvider>
  );
}
