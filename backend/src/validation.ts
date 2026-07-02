import { z } from "zod";

export const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Month must use YYYY-MM format");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9._-]+$/, "Username can use letters, numbers, dots, underscores, and dashes"),
  password: z.string().min(8).max(128)
});

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1).max(128)
});

export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive().max(100_000_000_000),
  currency: z.enum(["USD", "LBP"]).default("USD"),
  exchangeRate: z.coerce.number().positive().max(1_000_000).optional(),
  categoryId: z.string().min(1),
  merchant: z.string().trim().min(1).max(80),
  note: z.string().trim().max(240).optional(),
  occurredAt: z.string().datetime().optional()
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(40),
  kind: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex value"),
  icon: z.string().trim().min(1).max(40).default("pricetag")
});

export const updateCategorySchema = createCategorySchema;

export const createRecurringPaymentSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive().max(100_000_000_000),
  currency: z.enum(["USD", "LBP"]).default("USD"),
  exchangeRate: z.coerce.number().positive().max(1_000_000).optional(),
  categoryId: z.string().min(1),
  merchant: z.string().trim().min(1).max(80),
  note: z.string().trim().max(240).optional(),
  intervalUnit: z.enum(["day", "week", "month"]),
  intervalEvery: z.coerce.number().int().positive().max(36),
  scheduleDay: z.coerce.number().int().min(0).max(31).optional(),
  startAt: z.string().datetime().optional(),
  addNow: z.boolean().default(true)
});

export const transactionQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  type: z.enum(["income", "expense"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export const analyticsQuerySchema = z.object({
  month: monthSchema.optional()
});

export const eventSchema = z.object({
  name: z.string().trim().min(1).max(80),
  payload: z.record(z.string(), z.unknown()).optional()
});
