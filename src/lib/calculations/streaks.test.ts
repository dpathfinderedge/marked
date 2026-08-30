import { describe, it, expect } from "vitest";
import { detectConsecutiveLossFlags } from "./streaks";
import { makeTrade } from "./testHelpers";

describe("detectConsecutiveLossFlags", () => {
  it("flags a trade once the preceding loss streak reaches the threshold", () => {
    const trades = [
      makeTrade({ id: "1", date: "2026-01-01", pnl: -10 }),
      makeTrade({ id: "2", date: "2026-01-02", pnl: -10 }),
      makeTrade({ id: "3", date: "2026-01-03", pnl: 50 }), 
      makeTrade({ id: "4", date: "2026-01-04", pnl: -10 }),
      makeTrade({ id: "5", date: "2026-01-05", pnl: -10 }),
      makeTrade({ id: "6", date: "2026-01-06", pnl: -10 }), 
      makeTrade({ id: "7", date: "2026-01-07", pnl: 20 }),
    ];

    const flagged = detectConsecutiveLossFlags(trades, 2);

    expect(flagged.has("1")).toBe(false);
    expect(flagged.has("2")).toBe(false);
    expect(flagged.has("3")).toBe(true);
    expect(flagged.has("4")).toBe(false);
    expect(flagged.has("5")).toBe(false);
    expect(flagged.has("6")).toBe(true);
    expect(flagged.has("7")).toBe(true);
  });

  it("flags nothing when no streak reaches the threshold", () => {
    const trades = [
      makeTrade({ id: "1", date: "2026-01-01", pnl: -10 }),
      makeTrade({ id: "2", date: "2026-01-02", pnl: 20 }),
    ];
    expect(detectConsecutiveLossFlags(trades, 2).size).toBe(0);
  });

  it("re-sorts chronologically by date regardless of input order", () => {
    const trades = [
      makeTrade({ id: "later", date: "2026-01-03", pnl: 50 }),
      makeTrade({ id: "first", date: "2026-01-01", pnl: -10 }),
      makeTrade({ id: "second", date: "2026-01-02", pnl: -10 }),
    ];
    expect(detectConsecutiveLossFlags(trades, 2).has("later")).toBe(true);
  });

  it("treats a threshold of 0 as disabled", () => {
    const trades = [
      makeTrade({ id: "1", date: "2026-01-01", pnl: -10 }),
      makeTrade({ id: "2", date: "2026-01-02", pnl: -10 }),
    ];
    expect(detectConsecutiveLossFlags(trades, 0).size).toBe(0);
  });
});