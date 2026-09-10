import { Account, Category, Transaction } from "./types";

// Небольшой детерминированный генератор случайных чисел (без внешних зависимостей),
// чтобы демо-данные были воспроизводимы между запусками.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const round2 = (n: number) => Math.round(n * 100) / 100;

export const ACCOUNTS: Account[] = [
  { id: "acc-1", name: "Основная дебетовая", bank: "Т-Банк", type: "Дебетовая карта", currency: "AMD" },
  { id: "acc-2", name: "Кредитная карта", bank: "Альфа-Банк", type: "Кредитная карта", currency: "AMD" },
  { id: "acc-3", name: "Накопительный счёт", bank: "Сбербанк", type: "Накопительный счёт", currency: "AMD" },
];

const MERCHANTS: Record<Category, string[]> = {
  "Продукты": ["Пятёрочка", "Перекрёсток", "ВкусВилл", "Магнит"],
  "Кафе и рестораны": ["Кафе Пушкин", "Starbucks", "Додо Пицца", "Coffee Bean", "Шоколадница"],
  "Транспорт": ["Яндекс.Такси", "Метро", "Ситимобил", "АЗС Лукойл"],
  "Жильё и коммунальные": ["ЖКХ", "Интернет-провайдер", "Мосэнергосбыт"],
  "Подписки и сервисы": ["Яндекс.Плюс", "Netflix", "Spotify", "Fitness Club", "iCloud"],
  "Здоровье": ["Аптека", "Клиника Медси", "Инвитро"],
  "Развлечения": ["Кинотеатр", "Steam", "Билеты в театр"],
  "Одежда": ["Zara", "H&M", "Ozon"],
  "Путешествия": ["Aeroflot", "Booking.com", "РЖД"],
  "Образование": ["ACA курс", "Coursera", "Книжный магазин"],
  "Переводы": ["Перевод другу", "Перевод родителям"],
  "Прочее": ["Разное"],
};

let txCounter = 0;
function makeTx(accountId: string, date: Date, merchant: string, category: Category, amount: number): Transaction {
  txCounter += 1;
  return {
    id: `tx-${txCounter}`,
    accountId,
    date: date.toISOString().slice(0, 10),
    merchant,
    category,
    amount: round2(amount),
    currency: "AMD",
  };
}

/**
 * Генерирует ~6 месяцев синтетических транзакций с намеренно заложенными
 * паттернами, чтобы было что находить и обсуждать с агентом:
 *  - регулярные подписки (одинаковая сумма, один и тот же день месяца)
 *  - постепенный рост трат на кафе/рестораны ("категориальный крип")
 *  - всплеск трат на путешествия в один месяц
 *  - задвоенное списание (потенциальная ошибка биллинга)
 */
export function generateSyntheticTransactions(monthsBack = 6, endMonth: Date = new Date()): Transaction[] {
  const transactions: Transaction[] = [];
  const today = endMonth;
  const startMonth = new Date(today.getFullYear(), today.getMonth() - (monthsBack - 1), 1);

  for (let m = 0; m < monthsBack; m++) {
    const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + m, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    // Зарплата
    transactions.push(
      makeTx("acc-1", new Date(monthDate.getFullYear(), monthDate.getMonth(), 5), "Зарплата", "Прочее", 550000)
    );

    // Регулярные подписки — одинаковая сумма и день каждый месяц
    transactions.push(makeTx("acc-2", new Date(monthDate.getFullYear(), monthDate.getMonth(), 3), "Netflix", "Подписки и сервисы", -5490));
    transactions.push(makeTx("acc-2", new Date(monthDate.getFullYear(), monthDate.getMonth(), 3), "Spotify", "Подписки и сервисы", -2190));
    transactions.push(makeTx("acc-2", new Date(monthDate.getFullYear(), monthDate.getMonth(), 10), "Fitness Club", "Подписки и сервисы", -28000));
    transactions.push(makeTx("acc-1", new Date(monthDate.getFullYear(), monthDate.getMonth(), 15), "ЖКХ", "Жильё и коммунальные", -38000 + round2(rand() * 3000)));
    transactions.push(makeTx("acc-1", new Date(monthDate.getFullYear(), monthDate.getMonth(), 16), "Интернет-провайдер", "Жильё и коммунальные", -9900));

    // Постепенный рост трат на кафе/рестораны — "категориальный крип"
    const cafeVisits = 8 + m * 2; // растёт от месяца к месяцу
    for (let i = 0; i < cafeVisits; i++) {
      const day = 1 + Math.floor(rand() * daysInMonth);
      transactions.push(
        makeTx(
          pick(["acc-1", "acc-2"]),
          new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
          pick(MERCHANTS["Кафе и рестораны"]),
          "Кафе и рестораны",
          -(2500 + round2(rand() * 7000))
        )
      );
    }

    // Продукты — стабильно каждую неделю
    for (let w = 0; w < 4; w++) {
      const day = Math.min(daysInMonth, 3 + w * 7);
      transactions.push(
        makeTx(
          "acc-1",
          new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
          pick(MERCHANTS["Продукты"]),
          "Продукты",
          -(15000 + round2(rand() * 18000))
        )
      );
    }

    // Транспорт — несколько раз в месяц
    for (let i = 0; i < 6; i++) {
      const day = 1 + Math.floor(rand() * daysInMonth);
      transactions.push(
        makeTx(
          "acc-1",
          new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
          pick(MERCHANTS["Транспорт"]),
          "Транспорт",
          -(800 + round2(rand() * 2500))
        )
      );
    }

    // Случайные траты в остальных категориях
    const otherCats: Category[] = ["Здоровье", "Развлечения", "Одежда", "Образование"];
    for (const cat of otherCats) {
      if (rand() > 0.4) {
        const day = 1 + Math.floor(rand() * daysInMonth);
        transactions.push(
          makeTx(
            pick(["acc-1", "acc-2"]),
            new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
            pick(MERCHANTS[cat]),
            cat,
            -(4000 + round2(rand() * 30000))
          )
        );
      }
    }

    // Всплеск трат на путешествия — только в предпоследнем месяце
    if (m === monthsBack - 2) {
      transactions.push(makeTx("acc-2", new Date(monthDate.getFullYear(), monthDate.getMonth(), 12), "Aeroflot", "Путешествия", -220000));
      transactions.push(makeTx("acc-2", new Date(monthDate.getFullYear(), monthDate.getMonth(), 12), "Booking.com", "Путешествия", -140000));
      transactions.push(makeTx("acc-2", new Date(monthDate.getFullYear(), monthDate.getMonth(), 20), "РЖД", "Путешествия", -40000));
    }

    // Задвоенное списание — потенциальная ошибка биллинга (последний месяц,
    // через 2 дня после обычного платежа за фитнес-клуб день 10)
    if (m === monthsBack - 1) {
      const day = 12;
      transactions.push(makeTx("acc-2", new Date(monthDate.getFullYear(), monthDate.getMonth(), day), "Fitness Club", "Подписки и сервисы", -28000));
    }
  }

  return transactions.sort((a, b) => a.date.localeCompare(b.date));
}
