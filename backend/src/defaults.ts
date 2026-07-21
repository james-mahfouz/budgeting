import type { Category, DbData } from "./types.js";

export const defaultCategoryTemplates: Array<Omit<Category, "id" | "userId"> & { id: string }> = [
  { id: "salary", name: "Salary", kind: "income", color: "#2F855A", icon: "wallet" },
  { id: "side-hustle", name: "Side hustle", kind: "income", color: "#2B6CB0", icon: "briefcase" },
  { id: "loan", name: "Loans", kind: "loan", color: "#7C3AED", icon: "swap-horizontal" },
  { id: "groceries", name: "Groceries", kind: "expense", color: "#DD6B20", icon: "cart" },
  { id: "rent", name: "Rent", kind: "expense", color: "#805AD5", icon: "home" },
  { id: "transport", name: "Transport", kind: "expense", color: "#3182CE", icon: "car" },
  { id: "dining", name: "Dining", kind: "expense", color: "#D53F8C", icon: "restaurant" },
  { id: "health", name: "Health", kind: "expense", color: "#38A169", icon: "medical" },
  { id: "shopping", name: "Shopping", kind: "expense", color: "#C05621", icon: "bag" },
  { id: "bills", name: "Bills", kind: "expense", color: "#4A5568", icon: "receipt" },
  { id: "entertainment", name: "Entertainment", kind: "expense", color: "#B83280", icon: "ticket" }
];

export const categoriesForUser = (userId: string): Category[] =>
  defaultCategoryTemplates.map((category) => ({
    ...category,
    id: `${category.id}-${userId.slice(0, 8)}`,
    userId
  }));

export const emptyDb: DbData = {
  users: [],
  sessions: [],
  categories: [],
  subcategories: [],
  transactions: [],
  recurringPayments: [],
  events: []
};
