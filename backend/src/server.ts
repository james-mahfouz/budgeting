import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import type { ZodError } from "zod";
import { config } from "./config.js";
import { JsonStore } from "./db.js";
import { categoriesForUser } from "./defaults.js";
import {
  analyticsQuerySchema,
  createCategorySchema,
  createRecurringPaymentSchema,
  createTransactionSchema,
  eventSchema,
  loginSchema,
  registerSchema,
  transactionQuerySchema,
  updateCategorySchema,
  updateTransactionSchema
} from "./validation.js";
import { cashFlowTrend, getDashboardSummary, spendingByCategory } from "./services/analytics.js";
import {
  createRawToken,
  hashPassword,
  hashToken,
  isSessionActive,
  publicUser,
  sessionExpiry,
  verifyPassword
} from "./services/auth.js";
import { normalizeMoney } from "./services/currency.js";
import { currentMonth } from "./services/date.js";
import { addInterval, hasDueRecurringPayments, nextScheduledRun, processDueRecurringPayments } from "./services/recurring.js";
import type { AuthSession, Category, RecurringPayment, Transaction, User } from "./types.js";

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

  const issueSession = async (userId: string) => {
    const token = createRawToken();
    const now = new Date().toISOString();
    const session: AuthSession = {
      id: randomUUID(),
      userId,
      tokenHash: hashToken(token),
      createdAt: now,
      lastUsedAt: now,
      expiresAt: sessionExpiry(new Date(now))
    };

    await store.update((data) => {
      data.sessions = data.sessions.filter((item) => isSessionActive(item));
      data.sessions.push(session);
    });

    return token;
  };

  const getAuthUser = (request: FastifyRequest) => {
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    if (!token) {
      return null;
    }

    const db = store.snapshot;
    const session = db.sessions.find((item) => item.tokenHash === hashToken(token) && isSessionActive(item));
    if (!session) {
      return null;
    }

    const user = db.users.find((item) => item.id === session.userId);
    return user ? { user, session, token } : null;
  };

  const requireUser = (request: FastifyRequest, reply: FastifyReply): User | null => {
    const auth = getAuthUser(request);
    if (!auth) {
      reply.code(401).send({ error: "Authentication required" });
      return null;
    }

    return auth.user;
  };

  app.get("/health", async () => ({
    ok: true,
    service: "budgeting-backend",
    timestamp: new Date().toISOString()
  }));

  app.post("/api/auth/register", async (request, reply) => {
    const input = parseOrReply(registerSchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const now = new Date().toISOString();
    const user: User = {
      id: randomUUID(),
      name: input.name,
      username: input.username,
      passwordHash: hashPassword(input.password),
      createdAt: now,
      updatedAt: now
    };

    let created = false;
    await store.update((data) => {
      const existing = data.users.some((item) => item.username === input.username);
      if (existing) {
        return;
      }

      data.users.push(user);
      data.categories.push(...categoriesForUser(user.id));
      data.events.push({
        id: randomUUID(),
        userId: user.id,
        name: "user_registered",
        createdAt: now
      });
      created = true;
    });

    if (!created) {
      reply.code(409).send({ error: "Email already exists" });
      return;
    }

    const token = await issueSession(user.id);
    reply.code(201).send({ token, user: publicUser(user) });
  });

  app.post("/api/auth/login", async (request, reply) => {
    const input = parseOrReply(loginSchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const user = store.snapshot.users.find((item) => item.username === input.username);
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      reply.code(401).send({ error: "Invalid email or password" });
      return;
    }

    const token = await issueSession(user.id);
    reply.send({ token, user: publicUser(user) });
  });

  app.post("/api/auth/refresh", async (request, reply) => {
    const auth = getAuthUser(request);
    if (!auth) {
      reply.code(401).send({ error: "Authentication required" });
      return;
    }

    const token = createRawToken();
    const tokenHash = hashToken(token);
    const now = new Date().toISOString();
    await store.update((data) => {
      const session = data.sessions.find((item) => item.id === auth.session.id && item.userId === auth.user.id);
      if (!session) {
        return;
      }

      session.tokenHash = tokenHash;
      session.lastUsedAt = now;
      session.expiresAt = sessionExpiry(new Date(now));
    });

    reply.send({ token, user: publicUser(auth.user) });
  });

  app.get("/api/auth/me", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    reply.send({ user: publicUser(user) });
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const auth = getAuthUser(request);
    if (auth) {
      await store.update((data) => {
        data.sessions = data.sessions.filter((session) => session.id !== auth.session.id);
      });
    }

    reply.code(204).send();
  });

  app.get("/api/categories", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    return {
      categories: store.snapshot.categories.filter((category) => category.userId === user.id)
    };
  });

  app.post("/api/categories", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    const input = parseOrReply(createCategorySchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const now = new Date().toISOString();
    const baseId = slugify(input.name) || "category";
    let category: Category | undefined;

    await store.update((data) => {
      const existingName = data.categories.find(
        (item) => item.userId === user.id && item.kind === input.kind && item.name.toLowerCase() === input.name.toLowerCase()
      );

      if (existingName) {
        category = existingName;
        return;
      }

      const id = data.categories.some((item) => item.id === baseId) ? `${baseId}-${randomUUID().slice(0, 8)}` : baseId;
      category = {
        id,
        userId: user.id,
        name: input.name,
        kind: input.kind,
        color: input.color,
        icon: input.icon
      };
      data.categories.push(category);
      data.events.push({
        id: randomUUID(),
        userId: user.id,
        name: "category_created",
        payload: { categoryId: id, kind: input.kind },
        createdAt: now
      });
    });

    reply.code(201).send({ category });
  });

  app.put("/api/categories/:id", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    const id = (request.params as { id: string }).id;
    const input = parseOrReply(updateCategorySchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const now = new Date().toISOString();
    let category: Category | undefined;

    await store.update((data) => {
      category = data.categories.find((item) => item.id === id && item.userId === user.id);
      if (!category) {
        return;
      }

      category.name = input.name;
      category.kind = input.kind;
      category.color = input.color;
      category.icon = input.icon;

      data.events.push({
        id: randomUUID(),
        userId: user.id,
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
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    const id = (request.params as { id: string }).id;
    const now = new Date().toISOString();
    let removed = false;

    await store.update((data) => {
      const nextCategories = data.categories.filter((category) => category.id !== id || category.userId !== user.id);
      removed = nextCategories.length !== data.categories.length;

      if (!removed) {
        return;
      }

      data.categories = nextCategories;
      data.recurringPayments = data.recurringPayments.filter((rule) => rule.categoryId !== id || rule.userId !== user.id);
      data.events.push({
        id: randomUUID(),
        userId: user.id,
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
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    await syncDueRecurringPayments();
    const query = parseOrReply(transactionQuerySchema.safeParse(request.query), reply);
    if (!query) {
      return;
    }

    const transactions = store.snapshot.transactions
      .filter((transaction) => transaction.userId === user.id)
      .filter((transaction) => (query.type ? transaction.type === query.type : true))
      .filter((transaction) => (query.from ? transaction.occurredAt >= query.from : true))
      .filter((transaction) => (query.to ? transaction.occurredAt <= query.to : true))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, query.limit ?? 50);

    return { transactions };
  });

  app.post("/api/transactions", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    const input = parseOrReply(createTransactionSchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const db = store.snapshot;
    const category = db.categories.find((item) => item.id === input.categoryId && item.userId === user.id);

    if (!category || category.kind !== input.type) {
      reply.code(422).send({ error: "Category does not match the transaction type" });
      return;
    }

    const now = new Date().toISOString();
    const money = normalizeMoney(input.amount, input.currency, input.exchangeRate);
    const transaction: Transaction = {
      id: randomUUID(),
      userId: user.id,
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
        userId: user.id,
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

  app.put("/api/transactions/:id", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    const input = parseOrReply(updateTransactionSchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const db = store.snapshot;
    const category = db.categories.find((item) => item.id === input.categoryId && item.userId === user.id);

    if (!category || category.kind !== input.type) {
      reply.code(422).send({ error: "Category does not match the transaction type" });
      return;
    }

    const id = (request.params as { id: string }).id;
    const money = normalizeMoney(input.amount, input.currency, input.exchangeRate);
    const now = new Date().toISOString();
    let transaction: Transaction | undefined;

    await store.update((data) => {
      transaction = data.transactions.find((item) => item.id === id && item.userId === user.id);
      if (!transaction) {
        return;
      }

      transaction.type = input.type;
      transaction.amount = money.amount;
      transaction.currency = money.currency;
      transaction.originalAmount = money.originalAmount;
      transaction.exchangeRate = money.exchangeRate;
      transaction.categoryId = input.categoryId;
      transaction.merchant = input.merchant;
      transaction.note = input.note;
      transaction.occurredAt = input.occurredAt ?? transaction.occurredAt;

      data.events.push({
        id: randomUUID(),
        userId: user.id,
        name: "transaction_updated",
        payload: {
          transactionId: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency
        },
        createdAt: now
      });
    });

    if (!transaction) {
      reply.code(404).send({ error: "Transaction not found" });
      return;
    }

    reply.send({ transaction });
  });

  app.get("/api/recurring-payments", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    await syncDueRecurringPayments();
    return {
      recurringPayments: store.snapshot.recurringPayments
        .filter((rule) => rule.userId === user.id)
        .sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt))
    };
  });

  app.post("/api/recurring-payments", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    const input = parseOrReply(createRecurringPaymentSchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const db = store.snapshot;
    const category = db.categories.find((item) => item.id === input.categoryId && item.userId === user.id);

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
      userId: user.id,
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
          userId: user.id,
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
        userId: user.id,
        name: "recurring_payment_created",
        payload: { recurringPaymentId: recurringPayment.id, addNow: input.addNow },
        createdAt: nowIso
      });
    });

    reply.code(201).send({ recurringPayment });
  });

  app.delete("/api/recurring-payments/:id", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    const id = (request.params as { id: string }).id;
    let removed = false;

    await store.update((data) => {
      const next = data.recurringPayments.filter((rule) => rule.id !== id || rule.userId !== user.id);
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
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    const id = (request.params as { id: string }).id;
    let removed = false;

    await store.update((data) => {
      const next = data.transactions.filter((transaction) => transaction.id !== id || transaction.userId !== user.id);
      removed = next.length !== data.transactions.length;
      data.transactions = next;
    });

    if (!removed) {
      reply.code(404).send({ error: "Transaction not found" });
      return;
    }

    reply.code(204).send();
  });

  app.get("/api/analytics/summary", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    await syncDueRecurringPayments();
    const query = parseOrReply(analyticsQuerySchema.safeParse(request.query), reply);
    if (!query) {
      return;
    }

    const db = store.snapshot;
    return {
      summary: getDashboardSummary(db.transactions.filter((transaction) => transaction.userId === user.id), query.month ?? currentMonth())
    };
  });

  app.get("/api/analytics/categories", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    await syncDueRecurringPayments();
    const query = parseOrReply(analyticsQuerySchema.safeParse(request.query), reply);
    if (!query) {
      return;
    }

    const db = store.snapshot;
    const transactions = db.transactions.filter((transaction) => transaction.userId === user.id);
    const categories = db.categories.filter((category) => category.userId === user.id);
    return {
      categories: spendingByCategory(transactions, categories, query.month ?? currentMonth())
    };
  });

  app.get("/api/analytics/cash-flow", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    await syncDueRecurringPayments();
    return {
      cashFlow: cashFlowTrend(store.snapshot.transactions.filter((transaction) => transaction.userId === user.id))
    };
  });

  app.post("/api/events", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    const input = parseOrReply(eventSchema.safeParse(request.body), reply);
    if (!input) {
      return;
    }

    const event = {
      id: randomUUID(),
      userId: user.id,
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

  app.get("/api/events", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) {
      return;
    }

    const limit = Number((request.query as { limit?: string }).limit ?? 50);
    return {
      events: store.snapshot.events
        .filter((event) => event.userId === user.id)
        .slice(-Math.min(Math.max(limit, 1), 200))
        .reverse()
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
