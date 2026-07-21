import { describe, expect, it } from "vitest";
import { getDashboardSummary, spendingBySubcategory } from "./analytics.js";
import type { Category, Subcategory, Transaction } from "../types.js";

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

describe("spendingBySubcategory", () => {
  it("totals subcategory spending and calculates its share of the parent category", () => {
    const categories: Category[] = [
      { id: "transport", userId: "user-1", name: "Transport", kind: "expense", color: "#3182CE", icon: "car" }
    ];
    const subcategories: Subcategory[] = [
      { id: "fuel", userId: "user-1", categoryId: "transport", name: "Fuel" },
      { id: "parking", userId: "user-1", categoryId: "transport", name: "Parking" }
    ];
    const expenses: Transaction[] = [
      {
        id: "fuel-transaction",
        userId: "user-1",
        type: "expense",
        amount: 100,
        categoryId: "transport",
        subcategoryId: "fuel",
        merchant: "Fuel station",
        occurredAt: "2026-07-03T00:00:00.000Z",
        createdAt: "2026-07-03T00:00:00.000Z"
      },
      {
        id: "parking-transaction",
        userId: "user-1",
        type: "expense",
        amount: 50,
        categoryId: "transport",
        subcategoryId: "parking",
        merchant: "Parking",
        occurredAt: "2026-07-04T00:00:00.000Z",
        createdAt: "2026-07-04T00:00:00.000Z"
      },
      {
        id: "unassigned-transaction",
        userId: "user-1",
        type: "expense",
        amount: 50,
        categoryId: "transport",
        merchant: "Bus",
        occurredAt: "2026-07-05T00:00:00.000Z",
        createdAt: "2026-07-05T00:00:00.000Z"
      }
    ];

    expect(spendingBySubcategory(expenses, categories, subcategories, "2026-07")).toEqual([
      expect.objectContaining({ subcategoryId: "fuel", amount: 100, percentage: 50, categoryName: "Transport" }),
      expect.objectContaining({ subcategoryId: "parking", amount: 50, percentage: 25, categoryName: "Transport" })
    ]);
  });
});
