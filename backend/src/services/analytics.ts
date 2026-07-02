import type { Budget, Category, DashboardSummary, Transaction } from "../types.js";
import { currentMonth, monthBounds, monthLabel } from "./date.js";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const transactionsForMonth = (transactions: Transaction[], month = currentMonth()) => {
  const bounds = monthBounds(month);
  return transactions.filter((transaction) => {
    return transaction.occurredAt >= bounds.start && transaction.occurredAt < bounds.end;
  });
};

export const getDashboardSummary = (
  transactions: Transaction[],
  budgets: Budget[],
  month = currentMonth()
): DashboardSummary => {
  const monthlyTransactions = transactionsForMonth(transactions, month);
  const income = sum(monthlyTransactions.filter((item) => item.type === "income").map((item) => item.amount));
  const expenses = sum(monthlyTransactions.filter((item) => item.type === "expense").map((item) => item.amount));
  const monthlyBudgets = budgets.filter((budget) => budget.month === month);
  const budgetLimit = sum(monthlyBudgets.map((budget) => budget.limit));

  return {
    month,
    income,
    expenses,
    balance: income - expenses,
    budgetLimit,
    budgetSpent: expenses,
    budgetRemaining: budgetLimit - expenses,
    savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
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

export const cashFlowTrend = (transactions: Transaction[]) => {
  const months = new Map<string, { month: string; income: number; expenses: number; balance: number }>();
  const sorted = [...transactions].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  for (const transaction of sorted) {
    const month = monthLabel(transaction.occurredAt);
    const current = months.get(month) ?? { month, income: 0, expenses: 0, balance: 0 };

    if (transaction.type === "income") {
      current.income += transaction.amount;
    } else {
      current.expenses += transaction.amount;
    }

    current.balance = current.income - current.expenses;
    months.set(month, current);
  }

  return [...months.values()].slice(-6);
};

