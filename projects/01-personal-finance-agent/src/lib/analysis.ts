import { Category, Insight, Transaction } from "./types";

export function monthKey(date: string) {
  return date.slice(0, 7); // yyyy-mm
}

export function isExpense(t: Transaction) {
  return t.amount < 0;
}

export interface CategoryTotal {
  category: Category;
  total: number; // положительное число (сумма трат)
  share: number; // доля от общих трат, 0..1
}

export function categoryBreakdown(transactions: Transaction[]): CategoryTotal[] {
  const totals = new Map<Category, number>();
  let grandTotal = 0;

  for (const t of transactions.filter(isExpense)) {
    const abs = Math.abs(t.amount);
    totals.set(t.category, (totals.get(t.category) ?? 0) + abs);
    grandTotal += abs;
  }

  return [...totals.entries()]
    .map(([category, total]) => ({ category, total: round2(total), share: grandTotal ? total / grandTotal : 0 }))
    .sort((a, b) => b.total - a.total);
}

export interface MonthlyTotal {
  month: string; // yyyy-mm
  expenses: number;
  income: number;
}

export function monthlyTotals(transactions: Transaction[]): MonthlyTotal[] {
  const map = new Map<string, MonthlyTotal>();
  for (const t of transactions) {
    const key = monthKey(t.date);
    const entry = map.get(key) ?? { month: key, expenses: 0, income: 0 };
    if (t.amount < 0) entry.expenses += Math.abs(t.amount);
    else entry.income += t.amount;
    map.set(key, entry);
  }
  return [...map.values()]
    .map((e) => ({ month: e.month, expenses: round2(e.expenses), income: round2(e.income) }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface CategoryMonthlyTrend {
  category: Category;
  months: { month: string; total: number }[];
  trendPercent: number; // рост от первого к последнему месяцу, %
}

/** Тренд по категории от месяца к месяцу — нужен для обнаружения "категориального крипа". */
export function categoryMonthlyTrends(transactions: Transaction[]): CategoryMonthlyTrend[] {
  const byCategory = new Map<Category, Map<string, number>>();
  for (const t of transactions.filter(isExpense)) {
    const key = monthKey(t.date);
    if (!byCategory.has(t.category)) byCategory.set(t.category, new Map());
    const m = byCategory.get(t.category)!;
    m.set(key, (m.get(key) ?? 0) + Math.abs(t.amount));
  }

  const result: CategoryMonthlyTrend[] = [];
  for (const [category, monthMap] of byCategory.entries()) {
    const months = [...monthMap.entries()]
      .map(([month, total]) => ({ month, total: round2(total) }))
      .sort((a, b) => a.month.localeCompare(b.month));
    if (months.length < 3) continue;
    const first = months[0].total;
    const last = months[months.length - 1].total;
    const trendPercent = first > 0 ? round2(((last - first) / first) * 100) : 0;
    result.push({ category, months, trendPercent });
  }
  return result.sort((a, b) => b.trendPercent - a.trendPercent);
}

export interface RecurringCharge {
  merchant: string;
  category: Category;
  amount: number;
  occurrences: number;
  months: string[];
}

/** Находит подписки/регулярные платежи: один продавец, похожая сумма, разные месяцы. */
export function detectRecurringCharges(transactions: Transaction[]): RecurringCharge[] {
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of transactions.filter(isExpense)) {
    const key = t.merchant;
    if (!byMerchant.has(key)) byMerchant.set(key, []);
    byMerchant.get(key)!.push(t);
  }

  const result: RecurringCharge[] = [];
  for (const [merchant, txs] of byMerchant.entries()) {
    const months = new Set(txs.map((t) => monthKey(t.date)));
    if (months.size < 3) continue;

    const avgAmount = txs.reduce((s, t) => s + Math.abs(t.amount), 0) / txs.length;
    const isStable = txs.every((t) => Math.abs(Math.abs(t.amount) - avgAmount) / avgAmount < 0.05);
    if (!isStable) continue;

    result.push({
      merchant,
      category: txs[0].category,
      amount: round2(avgAmount),
      occurrences: txs.length,
      months: [...months].sort(),
    });
  }
  return result.sort((a, b) => b.amount - a.amount);
}

export interface DuplicateCharge {
  merchant: string;
  amount: number;
  dates: string[];
}

/** Находит подозрительно похожие списания у одного продавца в течение нескольких дней. */
export function detectDuplicateCharges(transactions: Transaction[]): DuplicateCharge[] {
  const byMerchantAmount = new Map<string, Transaction[]>();
  for (const t of transactions.filter(isExpense)) {
    const key = `${t.merchant}__${Math.abs(t.amount).toFixed(2)}`;
    if (!byMerchantAmount.has(key)) byMerchantAmount.set(key, []);
    byMerchantAmount.get(key)!.push(t);
  }

  const result: DuplicateCharge[] = [];
  for (const txs of byMerchantAmount.values()) {
    if (txs.length < 2) continue;
    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i++) {
      const daysApart = daysBetween(sorted[i - 1].date, sorted[i].date);
      if (daysApart <= 5) {
        result.push({
          merchant: sorted[i].merchant,
          amount: Math.abs(sorted[i].amount),
          dates: [sorted[i - 1].date, sorted[i].date],
        });
      }
    }
  }
  return result;
}

export interface LargeTransaction extends Transaction {
  deviationMultiple: number; // во сколько раз больше средней траты
}

/** Находит операции, значительно превышающие среднюю трату (статистический выброс). */
export function detectLargeTransactions(transactions: Transaction[]): LargeTransaction[] {
  const expenses = transactions.filter(isExpense);
  if (expenses.length === 0) return [];
  const avg = expenses.reduce((s, t) => s + Math.abs(t.amount), 0) / expenses.length;

  return expenses
    .filter((t) => Math.abs(t.amount) > avg * 4)
    .map((t) => ({ ...t, deviationMultiple: round2(Math.abs(t.amount) / avg) }))
    .sort((a, b) => b.deviationMultiple - a.deviationMultiple);
}

export function summary(transactions: Transaction[]) {
  const expenses = transactions.filter(isExpense).reduce((s, t) => s + Math.abs(t.amount), 0);
  const income = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const months = new Set(transactions.map((t) => monthKey(t.date))).size || 1;
  return {
    totalExpenses: round2(expenses),
    totalIncome: round2(income),
    net: round2(income - expenses),
    avgMonthlyExpenses: round2(expenses / months),
    monthsCovered: months,
    transactionCount: transactions.length,
  };
}

/** Собирает всё вместе в список "интересных находок" для дашборда. */
export function generateInsights(transactions: Transaction[]): Insight[] {
  const insights: Insight[] = [];

  const recurring = detectRecurringCharges(transactions);
  const totalRecurring = recurring.reduce((s, r) => s + r.amount, 0);
  if (recurring.length > 0) {
    insights.push({
      id: "recurring",
      severity: "info",
      title: `${recurring.length} регулярных платежей на ${formatAmd(totalRecurring)}/мес`,
      description: recurring.map((r) => `${r.merchant} — ${formatAmd(r.amount)}`).join(", "),
    });
  }

  const trends = categoryMonthlyTrends(transactions).filter((t) => t.trendPercent > 30);
  for (const trend of trends) {
    insights.push({
      id: `trend-${trend.category}`,
      severity: "notice",
      title: `Траты на «${trend.category}» выросли на ${trend.trendPercent}%`,
      description: `С ${formatAmd(trend.months[0].total)} до ${formatAmd(trend.months[trend.months.length - 1].total)} за отслеживаемый период.`,
    });
  }

  const duplicates = detectDuplicateCharges(transactions);
  for (const d of duplicates) {
    insights.push({
      id: `dup-${d.merchant}-${d.dates.join("-")}`,
      severity: "warning",
      title: `Возможное задвоенное списание: ${d.merchant}`,
      description: `${formatAmd(d.amount)} списано дважды — ${d.dates[0]} и ${d.dates[1]}.`,
    });
  }

  const large = detectLargeTransactions(transactions).slice(0, 3);
  for (const t of large) {
    insights.push({
      id: `large-${t.id}`,
      severity: "notice",
      title: `Крупная операция: ${t.merchant} — ${formatAmd(Math.abs(t.amount))}`,
      description: `В ${t.deviationMultiple}x больше средней операции (${t.date}).`,
    });
  }

  return insights;
}

function daysBetween(a: string, b: string) {
  return Math.abs((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatAmd(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "AMD", maximumFractionDigits: 0 }).format(n);
}
