import { describe, expect, it } from "vitest";
import { getDashboardSummary } from "./analytics.js";
import type { Budget, Transaction } from "../types.js";

const transactions: Transaction[] = [
  {
    id: "1",
    type: "income",
    amount: 1000,
    categoryId: "salary",
    merchant: "Paycheck",
    occurredAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "2",
    type: "expense",
    amount: 250,
    categoryId: "groceries",
    merchant: "Market",
    occurredAt: "2026-07-02T00:00:00.000Z",
    createdAt: "2026-07-02T00:00:00.000Z"
  }
];

const budgets: Budget[] = [
  {
    id: "b1",
    categoryId: "groceries",
    month: "2026-07",
    limit: 400,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z"
  }
];

describe("getDashboardSummary", () => {
  it("summarizes income, expenses, budget progress, and savings rate", () => {
    const summary = getDashboardSummary(transactions, budgets, "2026-07");

    expect(summary.income).toBe(1000);
    expect(summary.expenses).toBe(250);
    expect(summary.balance).toBe(750);
    expect(summary.budgetRemaining).toBe(150);
    expect(summary.savingsRate).toBe(75);
  });
});

