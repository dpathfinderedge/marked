import { describe, it, expect } from "vitest";
import { calculateCrossPairPnl } from "./crossPair";

describe("calculateCrossPairPnl", () => {
  it("prices a cross pair using the supplied quote-to-USD rate", () => {
    const result = calculateCrossPairPnl({
      pair: "EURGBP",
      direction: "long",
      entryPrice: 0.86,
      exitPrice: 0.865,
      lots: 1,
      contractSize: "standard",
      quoteToUsdRate: 1.27,
    });
    expect(result.pnl).toBeCloseTo(635, 2);
    expect(result.pips).toBeCloseTo(50, 1);
  });

  it("flips sign correctly for a short trade", () => {
    const result = calculateCrossPairPnl({
      pair: "EURGBP",
      direction: "short",
      entryPrice: 0.865,
      exitPrice: 0.86,
      lots: 1,
      contractSize: "standard",
      quoteToUsdRate: 1.27,
    });
    expect(result.pnl).toBeCloseTo(635, 2);
  });

  it("uses a 0.01 pip size when the quote currency is JPY", () => {
    const result = calculateCrossPairPnl({
      pair: "EURJPY",
      direction: "long",
      entryPrice: 160,
      exitPrice: 161,
      lots: 1,
      contractSize: "standard",
      quoteToUsdRate: 0.0066,
    });
    expect(result.pips).toBeCloseTo(100, 1);
  });
});