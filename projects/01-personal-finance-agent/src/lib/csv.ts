import Papa from "papaparse";
import { Category, Transaction } from "./types";

const CATEGORIES: Category[] = [
  "Продукты",
  "Кафе и рестораны",
  "Транспорт",
  "Жильё и коммунальные",
  "Подписки и сервисы",
  "Здоровье",
  "Развлечения",
  "Одежда",
  "Путешествия",
  "Образование",
  "Переводы",
  "Прочее",
];

export const CSV_COLUMNS = ["date", "merchant", "category", "amount", "currency", "account"] as const;

export interface ParseResult {
  transactions: Transaction[];
  errors: string[];
}

function normalizeCategory(raw: string): Category {
  const found = CATEGORIES.find((c) => c.toLowerCase() === raw.trim().toLowerCase());
  return found ?? "Прочее";
}

/**
 * Разбирает CSV-выписку в формате:
 * date,merchant,category,amount,currency,account
 * 2025-01-05,Пятёрочка,Продукты,-2350.50,RUB,Основная дебетовая
 *
 * Строки с ошибками пропускаются и перечисляются в errors, чтобы
 * не блокировать загрузку из-за пары "битых" строк в выписке.
 */
export function parseTransactionsCsv(csvText: string): ParseResult {
  const errors: string[] = [];
  const transactions: Transaction[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    parsed.errors.forEach((e) => errors.push(`Строка ${e.row ?? "?"}: ${e.message}`));
  }

  parsed.data.forEach((row, idx) => {
    const date = (row.date ?? "").trim();
    const merchant = (row.merchant ?? "").trim();
    const amountRaw = (row.amount ?? "").trim().replace(",", ".");
    const amount = Number(amountRaw);

    if (!date || !merchant || Number.isNaN(amount)) {
      errors.push(`Строка ${idx + 2}: не удалось распознать дату/продавца/сумму`);
      return;
    }

    transactions.push({
      id: `csv-${idx}-${date}-${merchant}`,
      accountId: (row.account ?? "Загруженный счёт").trim() || "Загруженный счёт",
      date,
      merchant,
      category: normalizeCategory(row.category ?? "Прочее"),
      amount,
      currency: (row.currency?.trim().toUpperCase() as Transaction["currency"]) || "RUB",
    });
  });

  return { transactions, errors };
}

export function transactionsToCsv(transactions: Transaction[]): string {
  return Papa.unparse(
    transactions.map((t) => ({
      date: t.date,
      merchant: t.merchant,
      category: t.category,
      amount: t.amount,
      currency: t.currency,
      account: t.accountId,
    })),
    { columns: [...CSV_COLUMNS] }
  );
}
