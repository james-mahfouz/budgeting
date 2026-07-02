import { config } from "./config.js";
import { JsonStore } from "./db.js";
import { categoriesForUser } from "./defaults.js";
import { hashPassword } from "./services/auth.js";
import type { RecurringPayment, Transaction, User } from "./types.js";

const month = new Date().toISOString().slice(0, 7);
const userId = "demo-user";
const isoForDay = (day: number) => `${month}-${String(day).padStart(2, "0")}T10:00:00.000Z`;
const id = (prefix: string, index: number) => `${prefix}-${month}-${index}`;
const categoryId = (id: string) => `${id}-${userId.slice(0, 8)}`;

const user: User = {
  id: userId,
  name: "Demo User",
  username: "demo",
  passwordHash: hashPassword("password123"),
  createdAt: isoForDay(1),
  updatedAt: isoForDay(1)
};

const transactions: Transaction[] = [
  {
    id: id("txn", 1),
    userId,
    type: "income",
    amount: 4200,
    categoryId: categoryId("salary"),
    merchant: "Paycheck",
    occurredAt: isoForDay(1),
    createdAt: isoForDay(1)
  },
  {
    id: id("txn", 2),
    userId,
    type: "expense",
    amount: 1200,
    categoryId: categoryId("rent"),
    merchant: "Apartment rent",
    occurredAt: isoForDay(2),
    createdAt: isoForDay(2)
  },
  {
    id: id("txn", 3),
    userId,
    type: "expense",
    amount: 86.45,
    categoryId: categoryId("groceries"),
    merchant: "Fresh Market",
    occurredAt: isoForDay(4),
    createdAt: isoForDay(4)
  },
  {
    id: id("txn", 4),
    userId,
    type: "expense",
    amount: 32.2,
    categoryId: categoryId("dining"),
    merchant: "Lunch",
    occurredAt: isoForDay(6),
    createdAt: isoForDay(6)
  },
  {
    id: id("txn", 5),
    userId,
    type: "expense",
    amount: 44.9,
    categoryId: categoryId("transport"),
    merchant: "Fuel",
    occurredAt: isoForDay(8),
    createdAt: isoForDay(8)
  },
  {
    id: id("txn", 6),
    userId,
    type: "income",
    amount: 350,
    categoryId: categoryId("side-hustle"),
    merchant: "Freelance project",
    occurredAt: isoForDay(10),
    createdAt: isoForDay(10)
  }
];

const recurringPayments: RecurringPayment[] = [
  {
    id: id("recurring", 1),
    userId,
    type: "expense",
    amount: 1200,
    categoryId: categoryId("rent"),
    merchant: "Apartment rent",
    intervalUnit: "month",
    intervalEvery: 1,
    nextRunAt: `${month}-28T10:00:00.000Z`,
    lastRunAt: isoForDay(2),
    isActive: true,
    createdAt: isoForDay(2),
    updatedAt: isoForDay(2)
  }
];

const run = async () => {
  const store = new JsonStore(config.dataFile);
  await store.init();
  await store.update((data) => {
    data.users = [user];
    data.sessions = [];
    data.categories = categoriesForUser(userId);
    data.transactions = transactions;
    data.recurringPayments = recurringPayments;
    data.events = [
      {
        id: id("event", 1),
        userId,
        name: "seed_loaded",
        payload: { month },
        createdAt: new Date().toISOString()
      }
    ];
  });

  console.log(
    `Seeded ${transactions.length} transactions and ${recurringPayments.length} recurring payments for ${month}`
  );
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
