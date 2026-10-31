import { describe, expect, it } from "vitest";
import {
  MAX_CURVE_POINTS,
  buildShareCard,
  downsample,
  periodLabel,
  tradesForPeriod,
} from "./shareCard";
import { makeTrade } from "./testHelpers";

const TODAY = "2026-10-31";
const t = (date: string, pnl: number, rMultiple: number | null = null) =>
  makeTrade({ date, pnl, rMultiple });

describe("tradesForPeriod", () => {
  const trades = [
    t("2026-09-30", 1),
    t("2026-10-01", 1),
    t("2026-10-02", 1),
    t("2026-10-31", 1),
    t("2026-11-02", 1), 
    t("2026-08-03", 1),
    t("2026-08-02", 1),
  ];

  it("this month runs from the 1st to today", () => {
    expect(tradesForPeriod(trades, "month", TODAY).map((x) => x.date)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-31",
    ]);
  });

  it("last 30 days includes today and the 29 days before", () => {
    const dates = tradesForPeriod(trades, "30d", TODAY).map((x) => x.date);
    expect(dates).toContain("2026-10-02");
    expect(dates).toContain("2026-10-31");
    expect(dates).not.toContain("2026-09-30");
    expect(dates).not.toContain("2026-11-02");
  });

  it("last 90 days reaches back to 3 August, and no further", () => {
    const dates = tradesForPeriod(trades, "90d", TODAY).map((x) => x.date);
    expect(dates).toContain("2026-08-03");
    expect(dates).not.toContain("2026-08-02");
  });

  it("all time keeps everything up to today", () => {
    expect(tradesForPeriod(trades, "all", TODAY)).toHaveLength(6);
  });
});

describe("periodLabel", () => {
  it("names each period", () => {
    expect(periodLabel("month", TODAY)).toBe("October 2026");
    expect(periodLabel("30d", TODAY)).toBe("Last 30 days");
    expect(periodLabel("90d", TODAY)).toBe("Last 90 days");
    expect(periodLabel("all", TODAY)).toBe("All time");
  });
});

describe("downsample", () => {
  it("leaves short lists alone", () => {
    expect(downsample([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });

  it("keeps the first and last values", () => {
    const values = Array.from({ length: 1000 }, (_, i) => i);
    const result = downsample(values, 50);
    expect(result).toHaveLength(50);
    expect(result[0]).toBe(0);
    expect(result[49]).toBe(999);
  });
});

describe("buildShareCard", () => {
  const trades = [t("2026-10-02", 100, 1), t("2026-10-05", -40, -0.4), t("2026-10-09", 60, 0.6)];

  it("is null when the period has no trades", () => {
    expect(buildShareCard(trades, { period: "month", showDollars: false, today: "2026-12-05" })).toBeNull();
    expect(buildShareCard([], { period: "all", showDollars: true, today: TODAY })).toBeNull();
  });

  it("works out the stats", () => {
    const card = buildShareCard(trades, { period: "month", showDollars: true, today: TODAY })!;
    expect(card).toMatchObject({
      periodLabel: "October 2026",
      trades: 3,
      wins: 2,
      losses: 1,
    });
    expect(card.winRate).toBeCloseTo(2 / 3);
    expect(card.profitFactor).toBeCloseTo(4);
    expect(card.averageR).toBeCloseTo(0.4);
  });

  it("shows net P&L as the headline when dollars are on", () => {
    const card = buildShareCard(trades, { period: "month", showDollars: true, today: TODAY })!;
    expect(card.hero).toEqual({ kind: "pnl", value: 120 });
  });

  it("shows total R when dollars are off, so no amount leaks", () => {
    const card = buildShareCard(trades, { period: "month", showDollars: false, today: TODAY })!;
    expect(card.hero.kind).toBe("totalR");
    expect(card.hero.value).toBeCloseTo(1.2);
    expect(card.showDollars).toBe(false);
  });

  it("falls back to win rate when no trade has a risk set", () => {
    const noR = [t("2026-10-02", 100), t("2026-10-03", -50)];
    const card = buildShareCard(noR, { period: "month", showDollars: false, today: TODAY })!;
    expect(card.hero.kind).toBe("winRate");
    expect(card.hero.value).toBe(0.5);
  });

  it("builds a curve that starts at zero and ends at the net result", () => {
    const card = buildShareCard(trades, { period: "month", showDollars: true, today: TODAY })!;
    expect(card.curve).toEqual([0, 100, 60, 120]);
  });

  it("keeps long curves to a drawable size", () => {
    const many = Array.from({ length: 500 }, (_, i) => t("2026-10-01", i % 2 === 0 ? 5 : -3));
    const card = buildShareCard(many, { period: "month", showDollars: true, today: TODAY })!;
    expect(card.curve.length).toBeLessThanOrEqual(MAX_CURVE_POINTS);
    expect(card.curve[0]).toBe(0);
    expect(card.curve[card.curve.length - 1]).toBe(500 / 2 * 5 - 500 / 2 * 3);
  });
});