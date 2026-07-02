import { describe, expect, it } from "vitest";
import { normalizeMoney } from "./currency.js";

describe("normalizeMoney", () => {
  it("keeps USD as USD", () => {
    expect(normalizeMoney(42.5, "USD")).toEqual({
      amount: 42.5,
      currency: "USD",
      originalAmount: 42.5,
      exchangeRate: 1
    });
  });

  it("converts LBP into USD using the provided rate", () => {
    expect(normalizeMoney(8_950_000, "LBP", 89_500)).toEqual({
      amount: 100,
      currency: "LBP",
      originalAmount: 8_950_000,
      exchangeRate: 89_500
    });
  });
});

