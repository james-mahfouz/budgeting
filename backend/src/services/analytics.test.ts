import { describe, expect, it } from "vitest";
import { getDashboardSummary } from "./analytics.js";
import type { Transaction } from "../types.js";

const transactions: Transaction[] = [
  {
    id: "1",
    userId: "user-1",
    type: "income",
    amount: 1000,
    categoryId: "salary",
    merchant: "Paycheck",
    occurredAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "2",
    userId: "user-1",
    type: "expense",
    amount: 250,
    categoryId: "groceries",
    merchant: "Market",
    occurredAt: "2026-07-02T00:00:00.000Z",
    createdAt: "2026-07-02T00:00:00.000Z"
  }
];

describe("getDashboardSummary", () => {
  it("summarizes income, expenses, balance, and savings rate", () => {
    const summary = getDashboardSummary(transactions, "2026-07");

    expect(summary.income).toBe(1000);
    expect(summary.expenses).toBe(250);
    expect(summary.balance).toBe(750);
    expect(summary.savingsRate).toBe(75);
  });
});
