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

const daysInUtcMonth = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const monthlyOccurrence = (year: number, monthIndex: number, day: number, reference: Date) => {
  const clampedDay = Math.min(day, daysInUtcMonth(year, monthIndex));
  return new Date(
    Date.UTC(
      year,
      monthIndex,
      clampedDay,
      reference.getUTCHours(),
      reference.getUTCMinutes(),
      reference.getUTCSeconds(),
      reference.getUTCMilliseconds()
    )
  );
};

export const nextScheduledRun = (
  after: Date,
  unit: RecurringIntervalUnit,
  every: number,
  scheduleDay?: number
) => {
  if (unit === "month" && scheduleDay) {
    let candidate = monthlyOccurrence(after.getUTCFullYear(), after.getUTCMonth(), scheduleDay, after);
    if (candidate <= after) {
      candidate = monthlyOccurrence(after.getUTCFullYear(), after.getUTCMonth() + every, scheduleDay, after);
    }
    return candidate;
  }

  if (unit === "week" && scheduleDay !== undefined) {
    const candidate = new Date(after);
    const dayDelta = (scheduleDay - candidate.getUTCDay() + 7) % 7;
    candidate.setUTCDate(candidate.getUTCDate() + dayDelta);

    if (candidate <= after) {
      candidate.setUTCDate(candidate.getUTCDate() + 7 * every);
    }

    return candidate;
  }

  return addInterval(after, unit, every);
};

const createTransactionFromRule = (rule: RecurringPayment, occurredAt: string): Transaction => ({
  id: randomUUID(),
  userId: rule.userId,
  type: rule.type,
  amount: rule.amount,
  currency: rule.currency,
  originalAmount: rule.originalAmount,
  exchangeRate: rule.exchangeRate,
  categoryId: rule.categoryId,
  subcategoryId: rule.subcategoryId,
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
      nextRun = nextScheduledRun(nextRun, rule.intervalUnit, rule.intervalEvery, rule.scheduleDay);
      created += 1;
      guard += 1;
    }

    rule.nextRunAt = nextRun.toISOString();
    rule.updatedAt = nowIso;
  }

  if (created > 0) {
    data.events.push({
      id: randomUUID(),
      userId: undefined,
      name: "recurring_payments_processed",
      payload: { created },
      createdAt: nowIso
    });
  }

  return created;
};
