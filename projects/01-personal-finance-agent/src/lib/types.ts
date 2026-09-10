export type Category =
  | "Продукты"
  | "Кафе и рестораны"
  | "Транспорт"
  | "Жильё и коммунальные"
  | "Подписки и сервисы"
  | "Здоровье"
  | "Развлечения"
  | "Одежда"
  | "Путешествия"
  | "Образование"
  | "Переводы"
  | "Прочее";

export interface Account {
  id: string;
  name: string;
  bank: string;
  type: "Дебетовая карта" | "Кредитная карта" | "Накопительный счёт";
  currency: "AMD" | "USD" | "EUR";
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO yyyy-mm-dd
  merchant: string;
  category: Category;
  amount: number; // negative = расход, positive = поступление
  currency: "AMD" | "USD" | "EUR";
}

export interface Insight {
  id: string;
  severity: "info" | "notice" | "warning";
  title: string;
  description: string;
}
