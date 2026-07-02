import { randomUUID } from "node:crypto";
import type { DbData, RecurringIntervalUnit, RecurringPayment, Transaction } from "../types.js";

export const addInterval = (date: Date, unit: RecurringIntervalUnit, every: number) => {
  const next = new Date(date);

  if (unit === "day") {
    next.setUTCDate(next.getUTCDate() + every);
  }

  if (unit === "week") {
    next.setUTCDate(next.getUTCDate() + every * 7);
  }

  if (unit === "month") {
    next.setUTCMonth(next.getUTCMonth() + every);
  }

  return next;
};

const createTransactionFromRule = (rule: RecurringPayment, occurredAt: string): Transaction => ({
  id: randomUUID(),
  type: rule.type,
  amount: rule.amount,
  currency: rule.currency,
  originalAmount: rule.originalAmount,
  exchangeRate: rule.exchangeRate,
  categoryId: rule.categoryId,
  merchant: rule.merchant,
  note: rule.note,
  occurredAt,
  createdAt: new Date().toISOString()
});

export const hasDueRecurringPayments = (data: DbData, now = new Date()) => {
  const nowIso = now.toISOString();
  return data.recurringPayments.some((rule) => rule.isActive && rule.nextRunAt <= nowIso);
};

export const processDueRecurringPayments = (data: DbData, now = new Date()) => {
  const nowIso = now.toISOString();
  let created = 0;

  for (const rule of data.recurringPayments) {
    if (!rule.isActive || rule.nextRunAt > nowIso) {
      continue;
    }

    let nextRun = new Date(rule.nextRunAt);
    let guard = 0;

    while (nextRun.toISOString() <= nowIso && guard < 24) {
      const occurredAt = nextRun.toISOString();
      data.transactions.push(createTransactionFromRule(rule, occurredAt));
      rule.lastRunAt = occurredAt;
      nextRun = addInterval(nextRun, rule.intervalUnit, rule.intervalEvery);
      created += 1;
      guard += 1;
    }

    rule.nextRunAt = nextRun.toISOString();
    rule.updatedAt = nowIso;
  }

  if (created > 0) {
    data.events.push({
      id: randomUUID(),
      name: "recurring_payments_processed",
      payload: { created },
      createdAt: nowIso
    });
  }

  return created;
};
