export type TransactionType = "income" | "expense";
export type RecurringIntervalUnit = "day" | "week" | "month";
export type Currency = "USD" | "LBP";

export type Category = {
  id: string;
  name: string;
  kind: TransactionType;
  color: string;
  icon: string;
};

export type Transaction = {
  id: string;
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

export type Budget = {
  id: string;
  categoryId: string;
  month: string;
  limit: number;
  spent: number;
  remaining: number;
  usage: number;
  category?: Category;
};

export type RecurringPayment = {
  id: string;
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
  budgetLimit: number;
  budgetSpent: number;
  budgetRemaining: number;
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
