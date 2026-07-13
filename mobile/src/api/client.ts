import { Platform } from "react-native";
import type {
  AuthResponse,
  CashFlowPoint,
  Category,
  CategorySpend,
  CreateCategoryInput,
  CreateRecurringPaymentInput,
  CreateTransactionInput,
  DashboardSummary,
  RecurringPayment,
  Transaction,
  UpdateCategoryInput
} from "../types";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000");

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

let authToken: string | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly email?: string
  ) {
    super(message);
  }
}

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const hasBody = options.body !== undefined;
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: hasBody ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    let code: string | undefined;
    let email: string | undefined;
    try {
      const error = (await response.json()) as {
        error?: string;
        code?: string;
        email?: string;
        details?: {
          formErrors?: string[];
          fieldErrors?: Record<string, string[]>;
        };
      };
      code = error.code;
      email = error.email;
      const fieldErrors = error.details?.fieldErrors
        ? Object.entries(error.details.fieldErrors)
            .flatMap(([field, errors]) => {
              const label = field === "username" ? "email" : field;
              return errors.map((item) => `${label}: ${item.replaceAll("Username", "Email").replaceAll("username", "email")}`);
            })
            .join("\n")
        : "";
      const formErrors = error.details?.formErrors?.join("\n") ?? "";
      message = fieldErrors || formErrors || error.error || message;
    } catch {
      // Keep the generic status message when the response is not JSON.
    }

    throw new ApiError(message, response.status, code, email);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const api = {
  health: () => request<{ ok: boolean; timestamp: string }>("/health"),
  register: (input: { name: string; username: string; password: string }) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", body: input }),
  login: (input: { username: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: input }),
  refresh: () => request<AuthResponse>("/api/auth/refresh", { method: "POST" }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  categories: () => request<{ categories: Category[] }>("/api/categories"),
  createCategory: (input: CreateCategoryInput) =>
    request<{ category: Category }>("/api/categories", { method: "POST", body: input }),
  updateCategory: (id: string, input: UpdateCategoryInput) =>
    request<{ category: Category }>(`/api/categories/${id}`, { method: "PUT", body: input }),
  deleteCategory: (id: string) => request<void>(`/api/categories/${id}`, { method: "DELETE" }),
  transactions: (limit = 50) => request<{ transactions: Transaction[] }>(`/api/transactions?limit=${limit}`),
  createTransaction: (input: CreateTransactionInput) =>
    request<{ transaction: Transaction }>("/api/transactions", { method: "POST", body: input }),
  deleteTransaction: (id: string) => request<void>(`/api/transactions/${id}`, { method: "DELETE" }),
  recurringPayments: () => request<{ recurringPayments: RecurringPayment[] }>("/api/recurring-payments"),
  createRecurringPayment: (input: CreateRecurringPaymentInput) =>
    request<{ recurringPayment: RecurringPayment }>("/api/recurring-payments", { method: "POST", body: input }),
  deleteRecurringPayment: (id: string) => request<void>(`/api/recurring-payments/${id}`, { method: "DELETE" }),
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
  summary: (month: string) => ["summary", month] as const,
  categorySpend: (month: string) => ["category-spend", month] as const,
  cashFlow: ["cash-flow"] as const
};

export const trackEvent = (name: string, payload?: Record<string, unknown>) => {
  void api.track(name, payload).catch(() => undefined);
};
