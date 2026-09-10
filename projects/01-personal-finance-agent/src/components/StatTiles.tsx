import { formatAmd } from "@/lib/analysis";

export function StatTiles({
  totalExpenses,
  totalIncome,
  net,
  avgMonthlyExpenses,
}: {
  totalExpenses: number;
  totalIncome: number;
  net: number;
  avgMonthlyExpenses: number;
}) {
  const tiles = [
    { label: "Всего расходов", value: formatAmd(totalExpenses) },
    { label: "Всего доходов", value: formatAmd(totalIncome) },
    { label: "Баланс", value: formatAmd(net), positive: net >= 0 },
    { label: "Средние траты в месяц", value: formatAmd(avgMonthlyExpenses) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
          <p className="text-xs opacity-60">{t.label}</p>
          <p
            className={`text-xl font-semibold mt-1 ${
              "positive" in t ? (t.positive ? "text-[#0ca30c]" : "text-[#d03b3b]") : ""
            }`}
          >
            {t.value}
          </p>
        </div>
      ))}
    </div>
  );
}
