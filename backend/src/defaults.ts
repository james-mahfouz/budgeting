import type { Category, DbData } from "./types.js";

export const defaultCategories: Category[] = [
  { id: "salary", name: "Salary", kind: "income", color: "#2F855A", icon: "wallet" },
  { id: "side-hustle", name: "Side hustle", kind: "income", color: "#2B6CB0", icon: "briefcase" },
  { id: "groceries", name: "Groceries", kind: "expense", color: "#DD6B20", icon: "cart" },
  { id: "rent", name: "Rent", kind: "expense", color: "#805AD5", icon: "home" },
  { id: "transport", name: "Transport", kind: "expense", color: "#3182CE", icon: "car" },
  { id: "dining", name: "Dining", kind: "expense", color: "#D53F8C", icon: "restaurant" },
  { id: "health", name: "Health", kind: "expense", color: "#38A169", icon: "medical" },
  { id: "shopping", name: "Shopping", kind: "expense", color: "#C05621", icon: "bag" },
  { id: "bills", name: "Bills", kind: "expense", color: "#4A5568", icon: "receipt" },
  { id: "entertainment", name: "Entertainment", kind: "expense", color: "#B83280", icon: "ticket" }
];

export const emptyDb: DbData = {
  categories: defaultCategories,
  transactions: [],
  budgets: [],
  events: []
};

