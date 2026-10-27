import { describe, expect, it } from "vitest";
import {
  cryptoPositionSize,
  forexPositionSize,
  isCrossPair,
  isMetalPair,
  isValidForexPair,
  normalizePair,
  pipValuePerLot,
  quoteCurrency,
  riskFromPercent,
  riskReward,
  type Calc,
} from "./calculator";

function value<T>(result: Calc<T>): T {
  if (!result.ok) throw new Error(`Expected a value, got: ${result.error}`);
  return result.value;
}

function errorOf<T>(result: Calc<T>): string {
  if (result.ok) throw new Error("Expected an error");
  return result.error;
}

describe("pair helpers", () => {
  it("cleans up what people type", () => {
    expect(normalizePair(" eur/usd ")).toBe("EURUSD");
    expect(isValidForexPair("eur/usd")).toBe(true);
    expect(isValidForexPair("EUR")).toBe(false);
    expect(isValidForexPair("BTCUSDT")).toBe(false);
  });

  it("spots cross pairs, metals and quote currencies", () => {
    expect(isCrossPair("EURGBP")).toBe(true);
    expect(isCrossPair("EURUSD")).toBe(false);
    expect(isCrossPair("USDJPY")).toBe(false);
    expect(isCrossPair("EUR")).toBe(false);
    expect(isMetalPair("XAUUSD")).toBe(true);
    expect(isMetalPair("EURUSD")).toBe(false);
    expect(quoteCurrency("EURGBP")).toBe("GBP");
  });
});

describe("pipValuePerLot", () => {
  it("is $10 for a standard lot of a USD-quoted pair", () => {
    expect(value(pipValuePerLot({ pair: "EURUSD", contractSize: "standard" }))).toBeCloseTo(10, 6);
  });

  it("scales with the contract size", () => {
    expect(value(pipValuePerLot({ pair: "EURUSD", contractSize: "mini" }))).toBeCloseTo(1, 6);
    expect(value(pipValuePerLot({ pair: "EURUSD", contractSize: "micro" }))).toBeCloseTo(0.1, 6);
  });

  it("converts yen pairs using the price", () => {
    // 0.01 * 100,000 / 150
    expect(
      value(pipValuePerLot({ pair: "USDJPY", contractSize: "standard", price: 150 })),
    ).toBeCloseTo(6.6667, 3);
  });

  it("converts cross pairs using the quote-to-USD rate", () => {
    expect(
      value(pipValuePerLot({ pair: "EURGBP", contractSize: "standard", quoteToUsdRate: 1.25 })),
    ).toBeCloseTo(12.5, 6);
  });

  it("supports custom contract sizes", () => {
    expect(
      value(
        pipValuePerLot({ pair: "XAUUSD", contractSize: "custom", customContractUnits: 100 }),
      ),
    ).toBeCloseTo(0.01, 8);
  });

  it("explains what's missing", () => {
    expect(errorOf(pipValuePerLot({ pair: "EUR", contractSize: "standard" }))).toMatch(/6-letter/);
    expect(errorOf(pipValuePerLot({ pair: "USDJPY", contractSize: "standard" }))).toMatch(/price/);
    expect(errorOf(pipValuePerLot({ pair: "EURGBP", contractSize: "standard" }))).toMatch(/GBP to USD/);
    expect(errorOf(pipValuePerLot({ pair: "EURUSD", contractSize: "custom" }))).toMatch(/units/);
  });
});

describe("riskFromPercent", () => {
  it("works out the dollars", () => {
    expect(riskFromPercent(10_000, 1)).toBe(100);
    expect(riskFromPercent(2_500, 0.5)).toBe(12.5);
  });

  it("is zero for missing or bad input", () => {
    expect(riskFromPercent(0, 1)).toBe(0);
    expect(riskFromPercent(1000, -1)).toBe(0);
    expect(riskFromPercent(Number.NaN, 1)).toBe(0);
  });
});

describe("forexPositionSize", () => {
  const base = { contractSize: "standard" as const };

  it("sizes a EURUSD long", () => {
    const result = value(
      forexPositionSize({ ...base, pair: "EURUSD", entry: 1.1, stop: 1.095, riskAmount: 100 }),
    );
    expect(result.direction).toBe("long");
    expect(result.stopPips).toBeCloseTo(50, 6);
    expect(result.pipValuePerLot).toBeCloseTo(10, 6);
    expect(result.lots).toBe(0.2);
    expect(result.riskAtLots).toBeCloseTo(100, 6);
    expect(result.units).toBeCloseTo(20_000, 6);
  });

  it("sizes a short from where the stop sits", () => {
    const result = value(
      forexPositionSize({ ...base, pair: "EURUSD", entry: 1.1, stop: 1.105, riskAmount: 100 }),
    );
    expect(result.direction).toBe("short");
    expect(result.lots).toBe(0.2);
  });

  it("uses the entry as the price for yen pairs", () => {
    const result = value(
      forexPositionSize({ ...base, pair: "USDJPY", entry: 150, stop: 149.5, riskAmount: 100 }),
    );
    expect(result.stopPips).toBeCloseTo(50, 6);
    expect(result.lots).toBe(0.3);
  });

  it("prices cross pairs with the rate", () => {
    const result = value(
      forexPositionSize({
        ...base,
        pair: "EURGBP",
        entry: 0.86,
        stop: 0.855,
        riskAmount: 125,
        quoteToUsdRate: 1.25,
      }),
    );
    expect(result.pipValuePerLot).toBeCloseTo(12.5, 6);
    expect(result.lots).toBe(0.2);
  });

  it("rounds the lots down so the risk never goes over", () => {
    const result = value(
      forexPositionSize({ ...base, pair: "EURUSD", entry: 1.1, stop: 1.097, riskAmount: 100 }),
    );
    // 30 pips at $10 -> 0.3333 lots exactly
    expect(result.lotsExact).toBeCloseTo(0.3333, 4);
    expect(result.lots).toBe(0.33);
    expect(result.riskAtLots).toBeLessThanOrEqual(100);
  });

  it("returns 0 lots when the risk is too small for the smallest size", () => {
    const result = value(
      forexPositionSize({ ...base, pair: "EURUSD", entry: 1.1, stop: 1.09, riskAmount: 5 }),
    );
    expect(result.lots).toBe(0);
  });

  it("handles gold with a custom contract size", () => {
    const result = value(
      forexPositionSize({
        pair: "XAUUSD",
        contractSize: "custom",
        customContractUnits: 100,
        entry: 2000,
        stop: 1990,
        riskAmount: 200,
      }),
    );
    expect(result.lots).toBe(0.2);
    expect(result.stopDistance).toBe(10);
  });

  it("explains bad input", () => {
    const input = { ...base, pair: "EURUSD", entry: 1.1, stop: 1.095, riskAmount: 100 };
    expect(errorOf(forexPositionSize({ ...input, entry: 0 }))).toMatch(/entry/i);
    expect(errorOf(forexPositionSize({ ...input, stop: 1.1 }))).toMatch(/stop/i);
    expect(errorOf(forexPositionSize({ ...input, riskAmount: 0 }))).toMatch(/risk/i);
    expect(errorOf(forexPositionSize({ ...input, pair: "EURGBP" }))).toMatch(/GBP to USD/);
  });
});

describe("riskReward", () => {
  it("works out the ratio for a long", () => {
    const result = value(riskReward({ entry: 100, stop: 95, target: 115 }));
    expect(result.direction).toBe("long");
    expect(result.riskDistance).toBe(5);
    expect(result.rewardDistance).toBe(15);
    expect(result.ratio).toBe(3);
    expect(result.breakEvenWinRate).toBe(0.25);
    expect(result.riskPercent).toBeCloseTo(5, 6);
    expect(result.rewardPercent).toBeCloseTo(15, 6);
  });

  it("works out the ratio for a short", () => {
    const result = value(riskReward({ entry: 100, stop: 104, target: 94 }));
    expect(result.direction).toBe("short");
    expect(result.ratio).toBeCloseTo(1.5, 6);
    expect(result.breakEvenWinRate).toBeCloseTo(0.4, 6);
  });

  it("shows pips for forex pairs", () => {
    const result = value(riskReward({ entry: 1.1, stop: 1.095, target: 1.11, pair: "eurusd" }));
    expect(result.riskPips).toBeCloseTo(50, 6);
    expect(result.rewardPips).toBeCloseTo(100, 6);
    expect(result.ratio).toBeCloseTo(2, 6);
  });

  it("leaves pips out for crypto symbols", () => {
    const result = value(riskReward({ entry: 100, stop: 95, target: 110, pair: "BTCUSDT" }));
    expect(result.riskPips).toBeNull();
  });

  it("works out the dollars to gain when the risk is known", () => {
    expect(value(riskReward({ entry: 100, stop: 95, target: 115, riskAmount: 50 })).rewardAmount).toBe(150);
    expect(value(riskReward({ entry: 100, stop: 95, target: 115 })).rewardAmount).toBeNull();
  });

  it("rejects a target on the wrong side", () => {
    expect(errorOf(riskReward({ entry: 100, stop: 95, target: 90 }))).toMatch(/above the entry/);
    expect(errorOf(riskReward({ entry: 100, stop: 105, target: 110 }))).toMatch(/below the entry/);
  });

  it("rejects missing or equal prices", () => {
    expect(errorOf(riskReward({ entry: 100, stop: 100, target: 110 }))).toMatch(/stop/i);
    expect(errorOf(riskReward({ entry: 0, stop: 95, target: 110 }))).toMatch(/Enter/);
  });
});

describe("cryptoPositionSize", () => {
  const base = {
    balance: 10_000,
    riskAmount: 100,
    maintenanceMarginPercent: 0.5,
  };

  it("sizes a long from the stop distance", () => {
    const result = value(
      cryptoPositionSize({ ...base, entry: 50_000, stop: 49_000, leverage: 10 }),
    );
    expect(result.direction).toBe("long");
    expect(result.quantity).toBeCloseTo(0.1, 8);
    expect(result.notional).toBeCloseTo(5000, 6);
    expect(result.margin).toBeCloseTo(500, 6);
    expect(result.stopPercent).toBeCloseTo(2, 6);
    expect(result.liquidationPrice).toBeCloseTo(45_250, 4);
    expect(result.liquidatesBeforeStop).toBe(false);
    expect(result.marginExceedsBalance).toBe(false);
  });

  it("warns when liquidation comes before the stop", () => {
    const result = value(
      cryptoPositionSize({ ...base, entry: 50_000, stop: 49_000, leverage: 50 }),
    );
    expect(result.liquidationPrice).toBeCloseTo(49_250, 4);
    expect(result.liquidatesBeforeStop).toBe(true);
  });

  it("works out liquidation for a short", () => {
    const result = value(
      cryptoPositionSize({ ...base, entry: 50_000, stop: 51_000, leverage: 10 }),
    );
    expect(result.direction).toBe("short");
    expect(result.liquidationPrice).toBeCloseTo(54_750, 4);
    expect(result.liquidatesBeforeStop).toBe(false);
  });

  it("has no liquidation price for spot", () => {
    const result = value(
      cryptoPositionSize({ ...base, entry: 50_000, stop: 49_000, leverage: 1 }),
    );
    expect(result.liquidationPrice).toBeNull();
    expect(result.liquidatesBeforeStop).toBe(false);
  });

  it("flags a position that needs more margin than the balance", () => {
    const result = value(
      cryptoPositionSize({
        balance: 1000,
        riskAmount: 100,
        entry: 50_000,
        stop: 49_900,
        leverage: 1,
        maintenanceMarginPercent: 0.5,
      }),
    );
    expect(result.margin).toBeCloseTo(50_000, 4);
    expect(result.marginExceedsBalance).toBe(true);
  });

  it("explains bad input", () => {
    const input = { ...base, entry: 50_000, stop: 49_000, leverage: 10 };
    expect(errorOf(cryptoPositionSize({ ...input, stop: 50_000 }))).toMatch(/stop/i);
    expect(errorOf(cryptoPositionSize({ ...input, riskAmount: 0 }))).toMatch(/risk/i);
    expect(errorOf(cryptoPositionSize({ ...input, leverage: 0.5 }))).toMatch(/Leverage/);
    expect(errorOf(cryptoPositionSize({ ...input, maintenanceMarginPercent: -1 }))).toMatch(/Maintenance/);
  });
});