import { describe, expect, it } from "vitest";
import { buildMonthGrid, summarizeMonth } from "./calendar";
import { makeTrade } from "./testHelpers";

const trade = (date: string, pnl: number) => makeTrade({ date, pnl });

describe("buildMonthGrid", () => {
  it("lays out whole weeks starting on Monday", () => {
    const weeks = buildMonthGrid("2026-10", []);
    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.days.length === 7)).toBe(true);
    expect(weeks[0]?.days[0]?.date).toBe("2026-09-28");
    expect(weeks[0]?.days[3]?.date).toBe("2026-10-01");
    expect(weeks[4]?.days[6]?.date).toBe("2026-11-01");
  });

  it("marks days from neighbouring months", () => {
    const weeks = buildMonthGrid("2026-10", []);
    expect(weeks[0]?.days[0]?.inMonth).toBe(false);
    expect(weeks[0]?.days[3]?.inMonth).toBe(true);
    expect(weeks[4]?.days[6]?.inMonth).toBe(false);
  });

  it("uses 4 weeks when the month fits exactly", () => {
    const weeks = buildMonthGrid("2027-02", []);
    expect(weeks).toHaveLength(4);
    expect(weeks[0]?.days[0]?.date).toBe("2027-02-01");
    expect(weeks[3]?.days[6]?.date).toBe("2027-02-28");
  });

  it("uses 6 weeks when a long month starts late in the week", () => {
    expect(buildMonthGrid("2026-08", [])).toHaveLength(6);
  });

  it("starts at the right place when the month begins on a Sunday", () => {
    const weeks = buildMonthGrid("2026-11", []);
    expect(weeks[0]?.days[0]?.date).toBe("2026-10-26");
    expect(weeks[0]?.days[6]?.date).toBe("2026-11-01");
  });

  it("adds up trades per day", () => {
    const weeks = buildMonthGrid("2026-10", [
      trade("2026-10-05", 50),
      trade("2026-10-05", -20),
      trade("2026-10-06", 10),
    ]);
    const all = weeks.flatMap((w) => w.days);
    expect(all.find((d) => d.date === "2026-10-05")).toMatchObject({
      pnl: 30,
      trades: 2,
    });
    expect(all.find((d) => d.date === "2026-10-07")).toMatchObject({
      pnl: 0,
      trades: 0,
    });
  });

  it("shows trades on neighbouring-month days but leaves them out of week totals", () => {
    const weeks = buildMonthGrid("2026-10", [
      trade("2026-09-30", 100), 
      trade("2026-10-01", 5),
    ]);
    const first = weeks[0];
    expect(first?.days[2]).toMatchObject({ date: "2026-09-30", pnl: 100, inMonth: false });
    expect(first?.pnl).toBe(5);
    expect(first?.trades).toBe(1);
  });

  it("rounds away floating-point dust", () => {
    const weeks = buildMonthGrid("2026-10", [
      trade("2026-10-05", 0.1),
      trade("2026-10-05", 0.2),
      trade("2026-10-05", -0.3),
    ]);
    const day = weeks.flatMap((w) => w.days).find((d) => d.date === "2026-10-05");
    expect(day?.pnl).toBe(0);
  });
});

describe("summarizeMonth", () => {
  it("counts green and red days and ignores other months", () => {
    const weeks = buildMonthGrid("2026-10", [
      trade("2026-09-30", 999), 
      trade("2026-10-01", 40),
      trade("2026-10-02", -15),
      trade("2026-10-02", 5), 
      trade("2026-10-05", 0), 
    ]);
    expect(summarizeMonth(weeks)).toEqual({
      pnl: 30,
      trades: 4,
      tradingDays: 3,
      greenDays: 1,
      redDays: 1,
      maxAbsDay: 40,
    });
  });

  it("is all zeros for an empty month", () => {
    expect(summarizeMonth(buildMonthGrid("2026-10", []))).toEqual({
      pnl: 0,
      trades: 0,
      tradingDays: 0,
      greenDays: 0,
      redDays: 0,
      maxAbsDay: 0,
    });
  });

  it("week totals add up to the month total", () => {
    const trades = [
      trade("2026-10-01", 10),
      trade("2026-10-14", -4),
      trade("2026-10-31", 7),
      trade("2026-11-01", 100),
    ];
    const weeks = buildMonthGrid("2026-10", trades);
    const weekSum = weeks.reduce((sum, w) => sum + w.pnl, 0);
    expect(weekSum).toBe(summarizeMonth(weeks).pnl);
    expect(weekSum).toBe(13);
  });
});