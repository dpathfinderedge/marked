import { describe, it, expect } from "vitest";
import {
  calculateForexPnl,
  resolveContractUnits,
  ForexCrossPairError,
} from "./forex";

describe("calculateForexPnl", () => {
  it("prices a direct pair (quote = USD) for a long trade", () => {
    const result = calculateForexPnl({
      pair: "EURUSD",
      direction: "long",
      entryPrice: 1.1,
      exitPrice: 1.105,
      lots: 1,
      contractSize: "standard",
    });
    expect(result.calcMode).toBe("direct");
    expect(result.pips).toBeCloseTo(50, 1);
    expect(result.pnl).toBeCloseTo(500, 2);
  });

  it("prices a direct pair for a short trade (profits on price fall)", () => {
    const result = calculateForexPnl({
      pair: "EURUSD",
      direction: "short",
      entryPrice: 1.105,
      exitPrice: 1.1,
      lots: 1,
      contractSize: "standard",
    });
    expect(result.pips).toBeCloseTo(50, 1);
    expect(result.pnl).toBeCloseTo(500, 2);
  });

  it("uses a 0.01 pip size for JPY pairs", () => {
    const result = calculateForexPnl({
      pair: "USDJPY",
      direction: "long",
      entryPrice: 150,
      exitPrice: 151,
      lots: 1,
      contractSize: "standard",
    });
    expect(result.pips).toBeCloseTo(100, 1);
  });

  it("converts a USD-base pair (quote != USD) using the exit rate", () => {
    const result = calculateForexPnl({
      pair: "USDJPY",
      direction: "long",
      entryPrice: 150,
      exitPrice: 151,
      lots: 1,
      contractSize: "standard",
    });
    expect(result.calcMode).toBe("converted");
    expect(result.pnl).toBeCloseTo(662.25, 2);
  });

  it("scales P&L by lot size and contract size", () => {
    const mini = calculateForexPnl({
      pair: "EURUSD",
      direction: "long",
      entryPrice: 1.1,
      exitPrice: 1.101,
      lots: 2,
      contractSize: "mini",
    });
    expect(mini.pnl).toBeCloseTo(20, 2);
  });

  it("uses customContractUnits when contractSize is custom", () => {
    const result = calculateForexPnl({
      pair: "EURUSD",
      direction: "long",
      entryPrice: 1.1,
      exitPrice: 1.101,
      lots: 1,
      contractSize: "custom",
      customContractUnits: 50000,
    });
    expect(result.pnl).toBeCloseTo(50, 2);
  });

  it("throws ForexCrossPairError for a true cross pair", () => {
    expect(() =>
      calculateForexPnl({
        pair: "EURGBP",
        direction: "long",
        entryPrice: 0.86,
        exitPrice: 0.865,
        lots: 1,
        contractSize: "standard",
      }),
    ).toThrow(ForexCrossPairError);
  });

  it("throws when contractSize is custom but no units are given", () => {
    expect(() =>
      resolveContractUnits({ lots: 1, contractSize: "custom" }),
    ).toThrow();
  });
});