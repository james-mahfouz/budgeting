import { z } from "zod";

export const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Month must use YYYY-MM format");

export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive().max(1_000_000),
  categoryId: z.string().min(1),
  merchant: z.string().trim().min(1).max(80),
  note: z.string().trim().max(240).optional(),
  occurredAt: z.string().datetime().optional()
});

export const transactionQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  type: z.enum(["income", "expense"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export const upsertBudgetSchema = z.object({
  categoryId: z.string().min(1),
  month: monthSchema,
  limit: z.coerce.number().positive().max(1_000_000)
});

export const analyticsQuerySchema = z.object({
  month: monthSchema.optional()
});

export const eventSchema = z.object({
  name: z.string().trim().min(1).max(80),
  payload: z.record(z.string(), z.unknown()).optional()
});

