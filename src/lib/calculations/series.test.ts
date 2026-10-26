import { describe, expect, it } from "vitest";
import {
  buildEquitySeries,
  calculateWeekdayPnl,
  summarizeSeries,
} from "./series";
import { makeTrade } from "./testHelpers";

const trade = (date: string, pnl: number) => makeTrade({ date, pnl });

describe("buildEquitySeries", () => {
  it("returns nothing when there are no trades", () => {
    expect(buildEquitySeries([], "ALL", "2026-10-20")).toEqual([]);
  });

  it("starts at zero the day before the first trade and fills every day", () => {
    const points = buildEquitySeries(
      [trade("2026-10-10", 100), trade("2026-10-13", -40)],
      "ALL",
      "2026-10-14",
    );
    expect(points.map((p) => p.date)).toEqual([
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
    ]);
    expect(points.map((p) => p.cumulativePnl)).toEqual([0, 100, 100, 100, 60, 60]);
  });

  it("adds up several trades on the same day", () => {
    const points = buildEquitySeries(
      [trade("2026-10-10", 50), trade("2026-10-10", -20)],
      "ALL",
      "2026-10-10",
    );
    const day = points.find((p) => p.date === "2026-10-10");
    expect(day).toMatchObject({ pnl: 30, trades: 2, cumulativePnl: 30 });
  });

  it("measures drawdown from the highest point so far", () => {
    const points = buildEquitySeries(
      [trade("2026-10-01", 100), trade("2026-10-02", -30), trade("2026-10-03", -20)],
      "ALL",
      "2026-10-03",
    );
    expect(points.map((p) => p.drawdown)).toEqual([0, 0, -30, -50]);
  });

  it("counts a loss from the start as drawdown from zero", () => {
    const points = buildEquitySeries([trade("2026-10-01", -25)], "ALL", "2026-10-01");
    expect(points[points.length - 1]?.drawdown).toBe(-25);
  });

  it("limits to the range and measures from its start", () => {
    const trades = [
      trade("2026-09-01", 1000),
      trade("2026-10-18", 40),
      trade("2026-10-20", -10),
    ];
    const points = buildEquitySeries(trades, "1W", "2026-10-20");
    expect(points[0]?.date).toBe("2026-10-13");
    expect(points[1]?.date).toBe("2026-10-14");
    expect(points[points.length - 1]).toMatchObject({
      date: "2026-10-20",
      cumulativePnl: 30,
    });
    expect(points.some((p) => p.date === "2026-09-01")).toBe(false);
  });

  it("doesn't pad before the first trade when the range is wider than the history", () => {
    const points = buildEquitySeries([trade("2026-10-15", 10)], "6M", "2026-10-20");
    expect(points[0]?.date).toBe("2026-10-14");
  });

  it("extends to today when the last trade was earlier", () => {
    const points = buildEquitySeries([trade("2026-10-01", 5)], "ALL", "2026-10-05");
    expect(points[points.length - 1]?.date).toBe("2026-10-05");
  });

  it("includes trades dated after today", () => {
    const points = buildEquitySeries([trade("2026-10-25", 5)], "ALL", "2026-10-20");
    expect(points[points.length - 1]?.date).toBe("2026-10-25");
  });

  it("crosses month and year ends", () => {
    const points = buildEquitySeries([trade("2026-12-30", 1)], "ALL", "2027-01-02");
    expect(points.map((p) => p.date)).toEqual([
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });
});

describe("summarizeSeries", () => {
  it("reports range P&L, drawdown and best and worst days", () => {
    const points = buildEquitySeries(
      [
        trade("2026-10-01", 100),
        trade("2026-10-02", -60),
        trade("2026-10-03", 30),
      ],
      "ALL",
      "2026-10-03",
    );
    expect(summarizeSeries(points)).toEqual({
      rangePnl: 70,
      maxDrawdown: -60,
      bestDay: { date: "2026-10-01", pnl: 100 },
      worstDay: { date: "2026-10-02", pnl: -60 },
      tradingDays: 3,
    });
  });

  it("handles a range with no trades in it", () => {
    const points = buildEquitySeries([trade("2026-01-01", 100)], "1W", "2026-10-20");
    expect(summarizeSeries(points)).toMatchObject({
      rangePnl: 0,
      maxDrawdown: 0,
      bestDay: null,
      worstDay: null,
      tradingDays: 0,
    });
  });

  it("handles an empty series", () => {
    expect(summarizeSeries([]).rangePnl).toBe(0);
  });
});

describe("calculateWeekdayPnl", () => {
  it("totals P&L by day of the week, Monday first", () => {
    const stats = calculateWeekdayPnl([
      trade("2026-10-19", 50),
      trade("2026-10-26", -20),
      trade("2026-10-25", 10),
    ]);
    expect(stats.map((s) => s.label)).toEqual([
      "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
    ]);
    expect(stats[0]).toEqual({ label: "Mon", pnl: 30, trades: 2 });
    expect(stats[6]).toEqual({ label: "Sun", pnl: 10, trades: 1 });
    expect(stats[2]).toEqual({ label: "Wed", pnl: 0, trades: 0 });
  });
});