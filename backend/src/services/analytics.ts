import type { Category, DashboardSummary, Subcategory, Transaction } from "../types.js";
import { currentMonth, monthBounds, monthLabel } from "./date.js";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const transactionsForMonth = (transactions: Transaction[], month = currentMonth()) => {
  const bounds = monthBounds(month);
  return transactions.filter((transaction) => {
    return transaction.occurredAt >= bounds.start && transaction.occurredAt < bounds.end;
  });
};

export const getDashboardSummary = (transactions: Transaction[], month = currentMonth()): DashboardSummary => {
  const monthlyTransactions = transactionsForMonth(transactions, month);
  const income = sum(monthlyTransactions.filter((item) => item.type === "income").map((item) => item.amount));
  const expenses = sum(monthlyTransactions.filter((item) => item.type === "expense").map((item) => item.amount));
  const loans = sum(monthlyTransactions.filter((item) => item.type === "loan").map((item) => item.amount));
  const outstandingLoans = sum(transactions.filter((item) => item.type === "loan" && !item.repaidAt).map((item) => item.amount));
  const balance = income - expenses - loans;

  return {
    month,
    income,
    expenses,
    loans,
    outstandingLoans,
    balance,
    savingsRate: income > 0 ? Math.round((balance / income) * 100) : 0,
    transactionCount: monthlyTransactions.length
  };
};

export const spendingByCategory = (
  transactions: Transaction[],
  categories: Category[],
  month = currentMonth()
) => {
  const monthlyExpenses = transactionsForMonth(transactions, month).filter((transaction) => transaction.type === "expense");
  const totals = new Map<string, number>();

  for (const transaction of monthlyExpenses) {
    totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + transaction.amount);
  }

  const totalSpent = sum([...totals.values()]);

  return categories
    .filter((category) => category.kind === "expense")
    .map((category) => {
      const amount = totals.get(category.id) ?? 0;
      return {
        categoryId: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        amount,
        percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
      };
    })
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);
};

export const spendingBySubcategory = (
  transactions: Transaction[],
  categories: Category[],
  subcategories: Subcategory[],
  month = currentMonth()
) => {
  const monthlyExpenses = transactionsForMonth(transactions, month).filter((transaction) => transaction.type === "expense");
  const categoryTotals = new Map<string, number>();
  const subcategoryTotals = new Map<string, number>();
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  for (const transaction of monthlyExpenses) {
    categoryTotals.set(transaction.categoryId, (categoryTotals.get(transaction.categoryId) ?? 0) + transaction.amount);
    if (transaction.subcategoryId) {
      subcategoryTotals.set(
        transaction.subcategoryId,
        (subcategoryTotals.get(transaction.subcategoryId) ?? 0) + transaction.amount
      );
    }
  }

  return subcategories
    .filter((subcategory) => categoriesById.get(subcategory.categoryId)?.kind === "expense")
    .map((subcategory) => {
      const category = categoriesById.get(subcategory.categoryId);
      const amount = subcategoryTotals.get(subcategory.id) ?? 0;
      const categoryAmount = categoryTotals.get(subcategory.categoryId) ?? 0;
      return {
        subcategoryId: subcategory.id,
        categoryId: subcategory.categoryId,
        name: subcategory.name,
        categoryName: category?.name ?? "Uncategorized",
        color: category?.color ?? "#718096",
        amount,
        percentage: categoryAmount > 0 ? Math.round((amount / categoryAmount) * 100) : 0
      };
    })
    .filter((subcategory) => subcategory.amount > 0)
    .sort((a, b) => b.amount - a.amount);
};

export const cashFlowTrend = (transactions: Transaction[]) => {
  const months = new Map<string, { month: string; income: number; expenses: number; loans: number; balance: number }>();
  const sorted = [...transactions].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  for (const transaction of sorted) {
    const month = monthLabel(transaction.occurredAt);
    const current = months.get(month) ?? { month, income: 0, expenses: 0, loans: 0, balance: 0 };

    if (transaction.type === "income") {
      current.income += transaction.amount;
    } else if (transaction.type === "loan") {
      current.loans += transaction.amount;
    } else {
      current.expenses += transaction.amount;
    }

    current.balance = current.income - current.expenses - current.loans;
    months.set(month, current);
  }

  return [...months.values()].slice(-6);
};
