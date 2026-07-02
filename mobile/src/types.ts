export type TransactionType = "income" | "expense";
export type RecurringIntervalUnit = "day" | "week" | "month";
export type Currency = "USD" | "LBP";

export type User = {
  id: string;
  name: string;
  username: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type Category = {
  id: string;
  userId: string;
  name: string;
  kind: TransactionType;
  color: string;
  icon: string;
};

export type Transaction = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency?: Currency;
  originalAmount?: number;
  exchangeRate?: number;
  categoryId: string;
  merchant: string;
  note?: string;
  occurredAt: string;
  createdAt: string;
};

export type RecurringPayment = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency?: Currency;
  originalAmount?: number;
  exchangeRate?: number;
  categoryId: string;
  merchant: string;
  note?: string;
  intervalUnit: RecurringIntervalUnit;
  intervalEvery: number;
  scheduleDay?: number;
  nextRunAt: string;
  lastRunAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DashboardSummary = {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
};

export type CategorySpend = {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  percentage: number;
};

export type CashFlowPoint = {
  month: string;
  income: number;
  expenses: number;
  balance: number;
};

export type CreateTransactionInput = {
  type: TransactionType;
  amount: number;
  currency?: Currency;
  exchangeRate?: number;
  categoryId: string;
  merchant: string;
  note?: string;
  occurredAt?: string;
};

export type CreateCategoryInput = {
  name: string;
  kind: TransactionType;
  color: string;
  icon: string;
};

export type UpdateCategoryInput = CreateCategoryInput;

export type CreateRecurringPaymentInput = {
  type: TransactionType;
  amount: number;
  currency?: Currency;
  exchangeRate?: number;
  categoryId: string;
  merchant: string;
  note?: string;
  intervalUnit: RecurringIntervalUnit;
  intervalEvery: number;
  scheduleDay?: number;
  addNow: boolean;
};
