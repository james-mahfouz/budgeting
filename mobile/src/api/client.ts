import { Platform } from "react-native";
import type {
  Budget,
  CashFlowPoint,
  Category,
  CategorySpend,
  CreateCategoryInput,
  CreateRecurringPaymentInput,
  CreateTransactionInput,
  DashboardSummary,
  RecurringPayment,
  Transaction
} from "../types";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000");

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const hasBody = options.body !== undefined;
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const error = (await response.json()) as { error?: string };
      message = error.error ?? message;
    } catch {
      // Keep the generic status message when the response is not JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const api = {
  health: () => request<{ ok: boolean; timestamp: string }>("/health"),
  categories: () => request<{ categories: Category[] }>("/api/categories"),
  createCategory: (input: CreateCategoryInput) =>
    request<{ category: Category }>("/api/categories", { method: "POST", body: input }),
  transactions: (limit = 50) => request<{ transactions: Transaction[] }>(`/api/transactions?limit=${limit}`),
  createTransaction: (input: CreateTransactionInput) =>
    request<{ transaction: Transaction }>("/api/transactions", { method: "POST", body: input }),
  deleteTransaction: (id: string) => request<void>(`/api/transactions/${id}`, { method: "DELETE" }),
  recurringPayments: () => request<{ recurringPayments: RecurringPayment[] }>("/api/recurring-payments"),
  createRecurringPayment: (input: CreateRecurringPaymentInput) =>
    request<{ recurringPayment: RecurringPayment }>("/api/recurring-payments", { method: "POST", body: input }),
  deleteRecurringPayment: (id: string) => request<void>(`/api/recurring-payments/${id}`, { method: "DELETE" }),
  budgets: (month: string) => request<{ budgets: Budget[] }>(`/api/budgets?month=${month}`),
  upsertBudget: (input: { categoryId: string; month: string; limit: number }) =>
    request<{ budget: Budget }>("/api/budgets", { method: "POST", body: input }),
  summary: (month: string) => request<{ summary: DashboardSummary }>(`/api/analytics/summary?month=${month}`),
  categorySpend: (month: string) =>
    request<{ categories: CategorySpend[] }>(`/api/analytics/categories?month=${month}`),
  cashFlow: () => request<{ cashFlow: CashFlowPoint[] }>("/api/analytics/cash-flow"),
  track: (name: string, payload?: Record<string, unknown>) =>
    request<{ event: unknown }>("/api/events", { method: "POST", body: { name, payload } })
};

export const queryKeys = {
  health: ["health"] as const,
  categories: ["categories"] as const,
  transactions: ["transactions"] as const,
  recurringPayments: ["recurring-payments"] as const,
  budgets: (month: string) => ["budgets", month] as const,
  summary: (month: string) => ["summary", month] as const,
  categorySpend: (month: string) => ["category-spend", month] as const,
  cashFlow: ["cash-flow"] as const
};

export const trackEvent = (name: string, payload?: Record<string, unknown>) => {
  void api.track(name, payload).catch(() => undefined);
};
