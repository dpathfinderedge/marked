import { describe, it, expect } from "vitest";
import { calculateCryptoPnl } from "./crypto";

describe("calculateCryptoPnl", () => {
  it("computes long P&L as (exit - entry) * quantity", () => {
    const pnl = calculateCryptoPnl({
      direction: "long",
      entryPrice: 60000,
      exitPrice: 61000,
      quantity: 0.1,
    });
    expect(pnl).toBeCloseTo(100, 2);
  });

  it("computes short P&L as (entry - exit) * quantity", () => {
    const pnl = calculateCryptoPnl({
      direction: "short",
      entryPrice: 61000,
      exitPrice: 60000,
      quantity: 0.1,
    });
    expect(pnl).toBeCloseTo(100, 2);
  });

  it("returns a loss when a long trade closes below entry", () => {
    const pnl = calculateCryptoPnl({
      direction: "long",
      entryPrice: 61000,
      exitPrice: 60000,
      quantity: 0.1,
    });
    expect(pnl).toBeCloseTo(-100, 2);
  });
});