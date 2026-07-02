import { config } from "../config.js";
import type { Currency } from "../types.js";

export const normalizeMoney = (amount: number, currency: Currency, exchangeRate?: number) => {
  const effectiveRate = currency === "LBP" ? exchangeRate ?? config.lbpPerUsd : 1;
  const usdAmount = currency === "LBP" ? amount / effectiveRate : amount;

  return {
    amount: Number(usdAmount.toFixed(2)),
    currency,
    originalAmount: amount,
    exchangeRate: effectiveRate
  };
};

