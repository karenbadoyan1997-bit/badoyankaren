import { Transaction } from "./types";
import {
  categoryBreakdown,
  categoryMonthlyTrends,
  detectDuplicateCharges,
  detectLargeTransactions,
  detectRecurringCharges,
  formatAmd,
  monthlyTotals,
  summary,
} from "./analysis";

/**
 * MVP-версия агента: без внешнего LLM, ответы собираются из готовой аналитики
 * по ключевым словам в вопросе. Архитектура рассчитана на замену этой функции
 * вызовом настоящей модели (с теми же данными analysis.ts как "инструментами"),
 * когда будет подключён API-ключ.
 */
export function answerQuestion(question: string, transactions: Transaction[]): string {
  const q = question.toLowerCase();

  if (transactions.length === 0) {
    return "Пока нет данных для анализа — загрузите выписку или синтетические данные на вкладке «Загрузка».";
  }

  if (/подпис|регуляр|recurring/.test(q)) {
    const recurring = detectRecurringCharges(transactions);
    if (recurring.length === 0) return "Не нашёл регулярных платежей с устойчивой суммой — возможно, данных пока мало.";
    const lines = recurring.map((r) => `• ${r.merchant} — ${formatAmd(r.amount)}/мес (${r.occurrences} раз)`);
    const total = recurring.reduce((s, r) => s + r.amount, 0);
    return `Нашёл ${recurring.length} регулярных платежей на общую сумму ${formatAmd(total)}/мес:\n${lines.join("\n")}`;
  }

  if (/дубл|подозрительн|странн|аномал|ошибк/.test(q)) {
    const duplicates = detectDuplicateCharges(transactions);
    const large = detectLargeTransactions(transactions).slice(0, 3);
    const parts: string[] = [];
    if (duplicates.length > 0) {
      parts.push(
        "Возможные задвоенные списания:\n" +
          duplicates.map((d) => `• ${d.merchant}, ${formatAmd(d.amount)}, ${d.dates.join(" и ")}`).join("\n")
      );
    }
    if (large.length > 0) {
      parts.push(
        "Необычно крупные операции:\n" +
          large.map((t) => `• ${t.merchant} — ${formatAmd(Math.abs(t.amount))} (в ${t.deviationMultiple}x больше средней), ${t.date}`).join("\n")
      );
    }
    return parts.length > 0 ? parts.join("\n\n") : "Ничего подозрительного не нашёл — операции выглядят типично.";
  }

  if (/чаще всего|больше всего трач|на что.*трач|топ категор|самая больш/.test(q)) {
    const top = categoryBreakdown(transactions).slice(0, 3);
    if (top.length === 0) return "Пока нет расходных операций для анализа.";
    const lines = top.map((c, i) => `${i + 1}. ${c.category} — ${formatAmd(c.total)} (${Math.round(c.share * 100)}% всех трат)`);
    return `Чаще всего вы тратите на:\n${lines.join("\n")}`;
  }

  if (/выросл|тренд|измени.*трат|растут ли/.test(q)) {
    const trends = categoryMonthlyTrends(transactions).filter((t) => Math.abs(t.trendPercent) > 15).slice(0, 3);
    if (trends.length === 0) return "Заметных изменений по категориям не нашёл — траты стабильны.";
    const lines = trends.map(
      (t) => `• ${t.category}: ${t.trendPercent > 0 ? "выросли" : "снизились"} на ${Math.abs(t.trendPercent)}%`
    );
    return `Вот что заметно изменилось по категориям:\n${lines.join("\n")}`;
  }

  if (/сколько.*(трач|расход)|средн.*месяц|бюджет/.test(q)) {
    const s = summary(transactions);
    return `В среднем вы тратите ${formatAmd(s.avgMonthlyExpenses)} в месяц (данные за ${s.monthsCovered} мес.). Всего расходов за период: ${formatAmd(
      s.totalExpenses
    )}.`;
  }

  if (/баланс|доход.*расход|остаток|накоп/.test(q)) {
    const s = summary(transactions);
    return `Доходы за период: ${formatAmd(s.totalIncome)}. Расходы: ${formatAmd(s.totalExpenses)}. Баланс: ${formatAmd(s.net)}.`;
  }

  if (/месяц.*месяц|по месяцам|динамик/.test(q)) {
    const months = monthlyTotals(transactions);
    const lines = months.map((m) => `• ${m.month}: доход ${formatAmd(m.income)}, расход ${formatAmd(m.expenses)}`);
    return `Динамика по месяцам:\n${lines.join("\n")}`;
  }

  const s = summary(transactions);
  const top = categoryBreakdown(transactions)[0];
  return (
    `Пока умею отвечать на вопросы про категории трат, регулярные платежи, подозрительные операции, ` +
    `баланс и динамику по месяцам. Например: "на что я чаще всего трачу деньги" или "какие у меня подписки".\n\n` +
    `Кратко: за отслеживаемый период расходы составили ${formatAmd(s.totalExpenses)}` +
    (top ? `, больше всего — на «${top.category}» (${formatAmd(top.total)}).` : ".")
  );
}
