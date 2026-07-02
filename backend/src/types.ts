export type TransactionType = "income" | "expense";
export type CategoryKind = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
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
  createdAt: string;
  updatedAt: string;
};

export type AnalyticsEvent = {
  id: string;
  name: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type DbData = {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  events: AnalyticsEvent[];
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

