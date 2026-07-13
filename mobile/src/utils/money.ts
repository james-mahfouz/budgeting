import { LBP_PER_USD } from "../config";

export { LBP_PER_USD };

export const money = (value = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);

export const lbpMoney = (value = 0) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value) + " LBP";

export const compactMoney = (value = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);

export const amountInputToNumber = (value: string) => Number(value.replace(/,/g, ""));

export const amountToUsd = (amount: number, currency: "USD" | "LBP", exchangeRate = LBP_PER_USD) =>
  currency === "LBP" ? amount / exchangeRate : amount;
