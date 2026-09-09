import { Insight } from "@/lib/types";

const SEVERITY_STYLE: Record<Insight["severity"], { icon: string; classes: string; label: string }> = {
  info: { icon: "ℹ️", classes: "border-black/10 dark:border-white/10", label: "Инфо" },
  notice: { icon: "⚠️", classes: "border-[#fab219]/50", label: "Заметно" },
  warning: { icon: "🚨", classes: "border-[#d03b3b]/60", label: "Требует внимания" },
};

export function InsightsList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 text-sm opacity-70">
        Пока не найдено заметных паттернов — загрузите больше данных за несколько месяцев.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6">
      <h3 className="font-semibold mb-4">Найденные паттерны</h3>
      <div className="space-y-3">
        {insights.map((ins) => {
          const style = SEVERITY_STYLE[ins.severity];
          return (
            <div key={ins.id} className={`rounded-xl border p-4 ${style.classes}`}>
              <div className="flex items-center gap-2 text-sm">
                <span aria-hidden>{style.icon}</span>
                <span className="font-medium">{ins.title}</span>
                <span className="ml-auto text-xs opacity-50">{style.label}</span>
              </div>
              <p className="text-sm opacity-70 mt-1">{ins.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
