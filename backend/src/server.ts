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
  createTransactionSchema,
  eventSchema,
  transactionQuerySchema,
  upsertBudgetSchema
} from "./validation.js";
import { cashFlowTrend, getDashboardSummary, spendingByCategory } from "./services/analytics.js";
import { currentMonth } from "./services/date.js";
import type { Budget, Transaction } from "./types.js";

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

  app.get("/health", async () => ({
    ok: true,
    service: "budgeting-backend",
    timestamp: new Date().toISOString()
  }));

  app.get("/api/categories", async () => ({
    categories: store.snapshot.categories
  }));

  app.get("/api/transactions", async (request, reply) => {
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
    const transaction: Transaction = {
      id: randomUUID(),
      type: input.type,
      amount: input.amount,
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
        payload: { transactionId: transaction.id, type: transaction.type, amount: transaction.amount },
        createdAt: now
      });
    });

    reply.code(201).send({ transaction });
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
    const query = parseOrReply(analyticsQuerySchema.safeParse(request.query), reply);
    if (!query) {
      return;
    }

    const db = store.snapshot;
    return {
      categories: spendingByCategory(db.transactions, db.categories, query.month ?? currentMonth())
    };
  });

  app.get("/api/analytics/cash-flow", async () => ({
    cashFlow: cashFlowTrend(store.snapshot.transactions)
  }));

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
