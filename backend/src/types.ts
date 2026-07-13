export type TransactionType = "income" | "expense" | "loan";
export type CategoryKind = TransactionType;
export type RecurringIntervalUnit = "day" | "week" | "month";
export type Currency = "USD" | "LBP";

export type User = {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
};

export type Category = {
  id: string;
  userId: string;
  name: string;
  kind: CategoryKind;
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
  repaidAt?: string;
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

export type AnalyticsEvent = {
  id: string;
  userId?: string;
  name: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type DbData = {
  users: User[];
  sessions: AuthSession[];
  categories: Category[];
  transactions: Transaction[];
  recurringPayments: RecurringPayment[];
  events: AnalyticsEvent[];
};

export type DashboardSummary = {
  month: string;
  income: number;
  expenses: number;
  loans: number;
  outstandingLoans: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
};
