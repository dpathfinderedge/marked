import { describe, it, expect } from "vitest";
import {
  calculateWinRate,
  calculateProfitFactor,
  calculateAverageRMultiple,
  calculateTotalPnl,
  calculateEquityCurve,
  calculateDailyPnl,
  calculateCurrentStreak,
  calculateLargestGain,
  calculateLargestLoss,
  breakdownByPair,
} from "./stats";
import { makeTrade } from "./testHelpers";

describe("calculateWinRate", () => {
  it("returns null for no trades", () => {
    expect(calculateWinRate([])).toBeNull();
  });

  it("computes wins / total", () => {
    const trades = [
      makeTrade({ pnl: 10 }),
      makeTrade({ pnl: -5 }),
      makeTrade({ pnl: 20 }),
      makeTrade({ pnl: -1 }),
    ];
    expect(calculateWinRate(trades)).toBeCloseTo(0.5, 5);
  });
});

describe("calculateProfitFactor", () => {
  it("divides gross wins by absolute gross losses", () => {
    const trades = [makeTrade({ pnl: 100 }), makeTrade({ pnl: -50 })];
    expect(calculateProfitFactor(trades)).toBeCloseTo(2, 5);
  });

  it("returns null when there are no losing trades", () => {
    expect(calculateProfitFactor([makeTrade({ pnl: 100 })])).toBeNull();
  });
});

describe("calculateAverageRMultiple", () => {
  it("averages only trades with a non-null rMultiple", () => {
    const trades = [
      makeTrade({ rMultiple: 2 }),
      makeTrade({ rMultiple: 4 }),
      makeTrade({ rMultiple: null }),
    ];
    expect(calculateAverageRMultiple(trades)).toBeCloseTo(3, 5);
  });

  it("returns null when no trade has a risk-based R", () => {
    expect(
      calculateAverageRMultiple([makeTrade({ rMultiple: null })]),
    ).toBeNull();
  });
});

describe("calculateTotalPnl", () => {
  it("sums pnl across trades", () => {
    const trades = [makeTrade({ pnl: 10 }), makeTrade({ pnl: -3 })];
    expect(calculateTotalPnl(trades)).toBeCloseTo(7, 5);
  });
});

describe("calculateEquityCurve", () => {
  it("returns a running cumulative total in chronological order", () => {
    const trades = [
      makeTrade({ id: "b", date: "2026-01-02", pnl: -5 }),
      makeTrade({ id: "a", date: "2026-01-01", pnl: 10 }),
    ];
    const curve = calculateEquityCurve(trades);
    expect(curve.map((p) => p.tradeId)).toEqual(["a", "b"]);
    expect(curve[0]?.cumulativePnl).toBeCloseTo(10, 5);
    expect(curve[1]?.cumulativePnl).toBeCloseTo(5, 5);
  });
});

describe("calculateDailyPnl", () => {
  it("sums P&L per date", () => {
    const trades = [
      makeTrade({ date: "2026-01-01", pnl: 10 }),
      makeTrade({ date: "2026-01-01", pnl: -3 }),
      makeTrade({ date: "2026-01-02", pnl: 5 }),
    ];
    const map = calculateDailyPnl(trades);
    expect(map.get("2026-01-01")).toBeCloseTo(7, 5);
    expect(map.get("2026-01-02")).toBeCloseTo(5, 5);
  });
});

describe("calculateCurrentStreak", () => {
  it("counts the trailing streak of the same outcome", () => {
    const trades = [
      makeTrade({ date: "2026-01-01", pnl: -10 }),
      makeTrade({ date: "2026-01-02", pnl: 10 }),
      makeTrade({ date: "2026-01-03", pnl: 10 }),
      makeTrade({ date: "2026-01-04", pnl: 10 }),
    ];
    expect(calculateCurrentStreak(trades)).toEqual({ count: 3, type: "win" });
  });

  it("returns type null when there are no trades", () => {
    expect(calculateCurrentStreak([])).toEqual({ count: 0, type: null });
  });

  it("treats a breakeven trade as breaking any streak", () => {
    const trades = [
      makeTrade({ date: "2026-01-01", pnl: 10 }),
      makeTrade({ date: "2026-01-02", pnl: 0 }),
    ];
    expect(calculateCurrentStreak(trades)).toEqual({ count: 0, type: null });
  });
});

describe("calculateLargestGain / calculateLargestLoss", () => {
  it("finds the biggest winner and loser", () => {
    const trades = [
      makeTrade({ id: "a", pnl: 50 }),
      makeTrade({ id: "b", pnl: 200 }),
      makeTrade({ id: "c", pnl: -30 }),
      makeTrade({ id: "d", pnl: -90 }),
    ];
    expect(calculateLargestGain(trades)?.tradeId).toBe("b");
    expect(calculateLargestLoss(trades)?.tradeId).toBe("d");
  });

  it("returns null when there are no winners/losers to find", () => {
    expect(calculateLargestGain([makeTrade({ pnl: -5 })])).toBeNull();
    expect(calculateLargestLoss([makeTrade({ pnl: 5 })])).toBeNull();
  });
});

describe("breakdownByPair", () => {
  it("groups trades by pair and sorts by total P&L descending", () => {
    const trades = [
      makeTrade({ pair: "EURUSD", pnl: 10 }),
      makeTrade({ pair: "GBPUSD", pnl: 100 }),
      makeTrade({ pair: "EURUSD", pnl: -5 }),
    ];
    const groups = breakdownByPair(trades);
    expect(groups[0]?.key).toBe("GBPUSD");
    expect(groups[0]?.trades).toBe(1);
    expect(groups[1]?.key).toBe("EURUSD");
    expect(groups[1]?.trades).toBe(2);
    expect(groups[1]?.totalPnl).toBeCloseTo(5, 5);
  });
});