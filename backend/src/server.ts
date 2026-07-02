import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import type { FastifyReply } from "fastify";
import { randomUUID } from "node:crypto";
import type { ZodError } from "zod";
import { config } from "./config.js";
import { JsonStore } from "./db.js";
import {
  analyticsQuerySchema,
  createCategorySchema,
  createRecurringPaymentSchema,
  createTransactionSchema,
  eventSchema,
  transactionQuerySchema,
  updateCategorySchema,
  upsertBudgetSchema
} from "./validation.js";
import { cashFlowTrend, getDashboardSummary, spendingByCategory } from "./services/analytics.js";
import { normalizeMoney } from "./services/currency.js";
import { currentMonth } from "./services/date.js";
import { addInterval, hasDueRecurringPayments, nextScheduledRun, processDueRecurringPayments } from "./services/recurring.js";
import type { Budget, Category, RecurringPayment, Transaction } from "./types.js";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const parseOrReply = <T>(
  result: { success: true; data: T } | { success: false; error: ZodError },
  reply: FastifyReply
): T | null => {
  if (result.success) {
    return result.data;
  }

  reply.code(400).send({
    error: "Validation failed",
    details: result.error.flatten()
  });

  return null;
};

export const buildServer = async (store: JsonStore) => {
  await store.init();

  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: process.env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" }
    }
  });

  await app.register(helmet);
  await app.register(cors, { origin: config.corsOrigin === "*" ? true : config.corsOrigin });
  await app.register(rateLimit, { max: 240, timeWindow: "1 minute" });

  const syncDueRecurringPayments = async () => {
    const snapshot = store.snapshot;
    if (!hasDueRecurringPayments(snapshot)) {
      return;
    }

    await store.update((data) => {
      processDueRecurringPayments(data);
    });
  };

  app.get("/health", async () => ({
    ok: true,
    service: "budgeting-backend",
    timestamp: new Date().toISOString()
  }));

  app.get("/api/categories", async () => ({
    categories: store.snapshot.categories
  }));

  app.post("/api/categories", async (request, reply) => {
    const input = parseOrReply(createCategorySchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const now = new Date().toISOString();
    const baseId = slugify(input.name) || "category";
    let category: Category | undefined;

    await store.update((data) => {
      const existingName = data.categories.find(
        (item) => item.kind === input.kind && item.name.toLowerCase() === input.name.toLowerCase()
      );

      if (existingName) {
        category = existingName;
        return;
      }

      const id = data.categories.some((item) => item.id === baseId) ? `${baseId}-${randomUUID().slice(0, 8)}` : baseId;
      category = {
        id,
        name: input.name,
        kind: input.kind,
        color: input.color,
        icon: input.icon
      };
      data.categories.push(category);
      data.events.push({
        id: randomUUID(),
        name: "category_created",
        payload: { categoryId: id, kind: input.kind },
        createdAt: now
      });
    });

    reply.code(201).send({ category });
  });

  app.put("/api/categories/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const input = parseOrReply(updateCategorySchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const now = new Date().toISOString();
    let category: Category | undefined;

    await store.update((data) => {
      category = data.categories.find((item) => item.id === id);
      if (!category) {
        return;
      }

      category.name = input.name;
      category.kind = input.kind;
      category.color = input.color;
      category.icon = input.icon;

      if (input.kind !== "expense") {
        data.budgets = data.budgets.filter((budget) => budget.categoryId !== id);
      }

      data.events.push({
        id: randomUUID(),
        name: "category_updated",
        payload: { categoryId: id, kind: input.kind },
        createdAt: now
      });
    });

    if (!category) {
      reply.code(404).send({ error: "Category not found" });
      return;
    }

    reply.send({ category });
  });

  app.delete("/api/categories/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const now = new Date().toISOString();
    let removed = false;

    await store.update((data) => {
      const nextCategories = data.categories.filter((category) => category.id !== id);
      removed = nextCategories.length !== data.categories.length;

      if (!removed) {
        return;
      }

      data.categories = nextCategories;
      data.budgets = data.budgets.filter((budget) => budget.categoryId !== id);
      data.recurringPayments = data.recurringPayments.filter((rule) => rule.categoryId !== id);
      data.events.push({
        id: randomUUID(),
        name: "category_deleted",
        payload: { categoryId: id },
        createdAt: now
      });
    });

    if (!removed) {
      reply.code(404).send({ error: "Category not found" });
      return;
    }

    reply.code(204).send();
  });

  app.get("/api/transactions", async (request, reply) => {
    await syncDueRecurringPayments();
    const query = parseOrReply(transactionQuerySchema.safeParse(request.query), reply);
    if (!query) {
      return;
    }

    const transactions = store.snapshot.transactions
      .filter((transaction) => (query.type ? transaction.type === query.type : true))
      .filter((transaction) => (query.from ? transaction.occurredAt >= query.from : true))
      .filter((transaction) => (query.to ? transaction.occurredAt <= query.to : true))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, query.limit ?? 50);

    return { transactions };
  });

  app.post("/api/transactions", async (request, reply) => {
    const input = parseOrReply(createTransactionSchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const db = store.snapshot;
    const category = db.categories.find((item) => item.id === input.categoryId);

    if (!category || category.kind !== input.type) {
      reply.code(422).send({ error: "Category does not match the transaction type" });
      return;
    }

    const now = new Date().toISOString();
    const money = normalizeMoney(input.amount, input.currency, input.exchangeRate);
    const transaction: Transaction = {
      id: randomUUID(),
      type: input.type,
      amount: money.amount,
      currency: money.currency,
      originalAmount: money.originalAmount,
      exchangeRate: money.exchangeRate,
      categoryId: input.categoryId,
      merchant: input.merchant,
      note: input.note,
      occurredAt: input.occurredAt ?? now,
      createdAt: now
    };

    await store.update((data) => {
      data.transactions.push(transaction);
      data.events.push({
        id: randomUUID(),
        name: "transaction_created",
        payload: {
          transactionId: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency
        },
        createdAt: now
      });
    });

    reply.code(201).send({ transaction });
  });

  app.get("/api/recurring-payments", async () => {
    await syncDueRecurringPayments();
    return {
      recurringPayments: store.snapshot.recurringPayments.sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt))
    };
  });

  app.post("/api/recurring-payments", async (request, reply) => {
    const input = parseOrReply(createRecurringPaymentSchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const db = store.snapshot;
    const category = db.categories.find((item) => item.id === input.categoryId);

    if (!category || category.kind !== input.type) {
      reply.code(422).send({ error: "Category does not match the recurring payment type" });
      return;
    }

    if (input.intervalUnit === "month" && (!input.scheduleDay || input.scheduleDay < 1 || input.scheduleDay > 31)) {
      reply.code(422).send({ error: "Monthly recurring payments need a day from 1 to 31" });
      return;
    }

    if (input.intervalUnit === "week" && (input.scheduleDay === undefined || input.scheduleDay < 0 || input.scheduleDay > 6)) {
      reply.code(422).send({ error: "Weekly recurring payments need a weekday" });
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const scheduledStartAt =
      input.intervalUnit === "month" || input.intervalUnit === "week"
        ? nextScheduledRun(now, input.intervalUnit, input.intervalEvery, input.scheduleDay)
        : input.startAt
          ? new Date(input.startAt)
          : addInterval(now, input.intervalUnit, input.intervalEvery);
    const money = normalizeMoney(input.amount, input.currency, input.exchangeRate);
    const recurringPayment: RecurringPayment = {
      id: randomUUID(),
      type: input.type,
      amount: money.amount,
      currency: money.currency,
      originalAmount: money.originalAmount,
      exchangeRate: money.exchangeRate,
      categoryId: input.categoryId,
      merchant: input.merchant,
      note: input.note,
      intervalUnit: input.intervalUnit,
      intervalEvery: input.intervalEvery,
      scheduleDay: input.scheduleDay,
      nextRunAt: scheduledStartAt.toISOString(),
      lastRunAt: input.addNow ? nowIso : undefined,
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await store.update((data) => {
      data.recurringPayments.push(recurringPayment);

      if (input.addNow) {
        data.transactions.push({
          id: randomUUID(),
          type: input.type,
          amount: money.amount,
          currency: money.currency,
          originalAmount: money.originalAmount,
          exchangeRate: money.exchangeRate,
          categoryId: input.categoryId,
          merchant: input.merchant,
          note: input.note,
          occurredAt: nowIso,
          createdAt: nowIso
        });
      }

      data.events.push({
        id: randomUUID(),
        name: "recurring_payment_created",
        payload: { recurringPaymentId: recurringPayment.id, addNow: input.addNow },
        createdAt: nowIso
      });
    });

    reply.code(201).send({ recurringPayment });
  });

  app.delete("/api/recurring-payments/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    let removed = false;

    await store.update((data) => {
      const next = data.recurringPayments.filter((rule) => rule.id !== id);
      removed = next.length !== data.recurringPayments.length;
      data.recurringPayments = next;
    });

    if (!removed) {
      reply.code(404).send({ error: "Recurring payment not found" });
      return;
    }

    reply.code(204).send();
  });

  app.delete("/api/transactions/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    let removed = false;

    await store.update((data) => {
      const next = data.transactions.filter((transaction) => transaction.id !== id);
      removed = next.length !== data.transactions.length;
      data.transactions = next;
    });

    if (!removed) {
      reply.code(404).send({ error: "Transaction not found" });
      return;
    }

    reply.code(204).send();
  });

  app.get("/api/budgets", async (request, reply) => {
    await syncDueRecurringPayments();
    const query = parseOrReply(analyticsQuerySchema.safeParse(request.query), reply);
    if (!query) {
      return;
    }

    const db = store.snapshot;
    const month = query.month ?? currentMonth();
    const monthTransactions = db.transactions.filter((transaction) => transaction.occurredAt.slice(0, 7) === month);
    const budgets = db.budgets
      .filter((budget) => budget.month === month)
      .map((budget) => {
        const category = db.categories.find((item) => item.id === budget.categoryId);
        const spent = monthTransactions
          .filter((transaction) => transaction.categoryId === budget.categoryId && transaction.type === "expense")
          .reduce((total, transaction) => total + transaction.amount, 0);

        return {
          ...budget,
          category,
          spent,
          remaining: budget.limit - spent,
          usage: budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0
        };
      });

    return { budgets };
  });

  app.post("/api/budgets", async (request, reply) => {
    const input = parseOrReply(upsertBudgetSchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const db = store.snapshot;
    const category = db.categories.find((item) => item.id === input.categoryId);

    if (!category || category.kind !== "expense") {
      reply.code(422).send({ error: "Budgets can only be set for expense categories" });
      return;
    }

    const now = new Date().toISOString();
    let budget: Budget | undefined;

    await store.update((data) => {
      budget = data.budgets.find((item) => item.categoryId === input.categoryId && item.month === input.month);

      if (budget) {
        budget.limit = input.limit;
        budget.updatedAt = now;
      } else {
        budget = {
          id: randomUUID(),
          categoryId: input.categoryId,
          month: input.month,
          limit: input.limit,
          createdAt: now,
          updatedAt: now
        };
        data.budgets.push(budget);
      }
    });

    reply.code(201).send({ budget });
  });

  app.get("/api/analytics/summary", async (request, reply) => {
    await syncDueRecurringPayments();
    const query = parseOrReply(analyticsQuerySchema.safeParse(request.query), reply);
    if (!query) {
      return;
    }

    const db = store.snapshot;
    return {
      summary: getDashboardSummary(db.transactions, db.budgets, query.month ?? currentMonth())
    };
  });

  app.get("/api/analytics/categories", async (request, reply) => {
    await syncDueRecurringPayments();
    const query = parseOrReply(analyticsQuerySchema.safeParse(request.query), reply);
    if (!query) {
      return;
    }

    const db = store.snapshot;
    return {
      categories: spendingByCategory(db.transactions, db.categories, query.month ?? currentMonth())
    };
  });

  app.get("/api/analytics/cash-flow", async () => {
    await syncDueRecurringPayments();
    return {
      cashFlow: cashFlowTrend(store.snapshot.transactions)
    };
  });

  app.post("/api/events", async (request, reply) => {
    const input = parseOrReply(eventSchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const event = {
      id: randomUUID(),
      name: input.name,
      payload: input.payload,
      createdAt: new Date().toISOString()
    };

    await store.update((data) => {
      data.events.push(event);
      data.events = data.events.slice(-1000);
    });

    reply.code(201).send({ event });
  });

  app.get("/api/events", async (request) => {
    const limit = Number((request.query as { limit?: string }).limit ?? 50);
    return {
      events: store.snapshot.events.slice(-Math.min(Math.max(limit, 1), 200)).reverse()
    };
  });

  return app;
};

const start = async () => {
  const store = new JsonStore(config.dataFile);
  const app = await buildServer(store);

  await app.listen({ host: config.host, port: config.port });
};

if (process.env.NODE_ENV !== "test") {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
