import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  detectPreset,
  filterTrades,
  formatRangeLabel,
  pageWindow,
  paginate,
  presetRange,
  sortTrades,
} from "./tradeFilters";
import { makeTrade } from "./testHelpers";

const trades = [
  makeTrade({ id: "a", date: "2026-10-01", pair: "EURUSD", pnl: 50, tag: "Breakout", market: "forex", direction: "long", session: "London", notes: "Clean retest" }),
  makeTrade({ id: "b", date: "2026-10-05", pair: "BTCUSDT", pnl: -30, tag: "Reversal", market: "crypto", direction: "short", session: "Asian", notes: "" }),
  makeTrade({ id: "c", date: "2026-10-10", pair: "GBPUSD", pnl: 0, tag: "breakout", market: "forex", direction: "short", session: "New York", notes: "News spike" }),
];

const ids = (list: { id: string }[]) => list.map((t) => t.id);

describe("filterTrades", () => {
  it("returns everything with no filters", () => {
    expect(ids(filterTrades(trades, EMPTY_FILTERS))).toEqual(["a", "b", "c"]);
  });

  it("searches pair, tag and notes without caring about case", () => {
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, search: "eur" }))).toEqual(["a"]);
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, search: "BREAKOUT" }))).toEqual(["a", "c"]);
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, search: "spike" }))).toEqual(["c"]);
  });

  it("needs every word to match", () => {
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, search: "breakout news" }))).toEqual(["c"]);
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, search: "breakout btc" }))).toEqual([]);
  });

  it("ignores extra spaces in the search", () => {
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, search: "   " }))).toHaveLength(3);
  });

  it("filters by market, direction and session", () => {
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, market: "crypto" }))).toEqual(["b"]);
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, direction: "short" }))).toEqual(["b", "c"]);
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, session: "London" }))).toEqual(["a"]);
  });

  it("treats breakeven as neither a win nor a loss", () => {
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, result: "win" }))).toEqual(["a"]);
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, result: "loss" }))).toEqual(["b"]);
  });

  it("includes both end dates", () => {
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, from: "2026-10-05", to: "2026-10-10" }))).toEqual(["b", "c"]);
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, from: "2026-10-06" }))).toEqual(["c"]);
    expect(ids(filterTrades(trades, { ...EMPTY_FILTERS, to: "2026-10-01" }))).toEqual(["a"]);
  });

  it("combines filters", () => {
    expect(
      ids(filterTrades(trades, { ...EMPTY_FILTERS, market: "forex", direction: "short" })),
    ).toEqual(["c"]);
  });
});

describe("countActiveFilters", () => {
  it("counts each switched-on filter once, with the date range as one", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(
      countActiveFilters({ ...EMPTY_FILTERS, search: "x", market: "forex", from: "2026-01-01", to: "2026-02-01" }),
    ).toBe(3);
    expect(countActiveFilters({ ...EMPTY_FILTERS, search: "  " })).toBe(0);
  });
});

describe("sortTrades", () => {
  it("sorts by date, newest first, without changing the input", () => {
    const copy = [...trades];
    expect(ids(sortTrades(trades, { key: "date", direction: "desc" }))).toEqual(["c", "b", "a"]);
    expect(trades).toEqual(copy);
  });

  it("sorts by P&L both ways", () => {
    expect(ids(sortTrades(trades, { key: "pnl", direction: "desc" }))).toEqual(["a", "c", "b"]);
    expect(ids(sortTrades(trades, { key: "pnl", direction: "asc" }))).toEqual(["b", "c", "a"]);
  });

  it("sorts pairs alphabetically", () => {
    expect(ids(sortTrades(trades, { key: "pair", direction: "asc" }))).toEqual(["b", "a", "c"]);
  });

  it("keeps trades without an R value last in either direction", () => {
    const withR = [
      makeTrade({ id: "x", rMultiple: null }),
      makeTrade({ id: "y", rMultiple: 2 }),
      makeTrade({ id: "z", rMultiple: -1 }),
    ];
    expect(ids(sortTrades(withR, { key: "r", direction: "desc" }))).toEqual(["y", "z", "x"]);
    expect(ids(sortTrades(withR, { key: "r", direction: "asc" }))).toEqual(["z", "y", "x"]);
  });

  it("breaks ties by when the trade was logged", () => {
    const sameDay = [
      makeTrade({ id: "early", date: "2026-10-01", createdAt: "2026-10-01T08:00:00Z" }),
      makeTrade({ id: "late", date: "2026-10-01", createdAt: "2026-10-01T15:00:00Z" }),
    ];
    expect(ids(sortTrades(sameDay, { key: "date", direction: "desc" }))).toEqual(["late", "early"]);
    expect(ids(sortTrades(sameDay, { key: "date", direction: "asc" }))).toEqual(["early", "late"]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);

  it("slices a page and reports the range", () => {
    const page = paginate(items, 2, 10);
    expect(page.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(page).toMatchObject({ page: 2, pageCount: 3, total: 23, from: 11, to: 20 });
  });

  it("handles a short last page", () => {
    expect(paginate(items, 3, 10)).toMatchObject({ from: 21, to: 23 });
    expect(paginate(items, 3, 10).items).toEqual([21, 22, 23]);
  });

  it("keeps the page inside the range", () => {
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate(items, Number.NaN, 10).page).toBe(1);
  });

  it("copes with an empty list", () => {
    expect(paginate([], 1, 10)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
      from: 0,
      to: 0,
    });
  });

  it("fits exactly when the total divides evenly", () => {
    expect(paginate(items.slice(0, 20), 2, 10)).toMatchObject({ pageCount: 2, from: 11, to: 20 });
  });
});

describe("pageWindow", () => {
  it("shows every page when there are few", () => {
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });

  it("collapses the middle of a long list", () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 4, "…", 20]);
    expect(pageWindow(10, 20)).toEqual([1, "…", 9, 10, 11, "…", 20]);
    expect(pageWindow(20, 20)).toEqual([1, "…", 17, 18, 19, 20]);
  });

  it("doesn't leave a gap of a single page", () => {
    expect(pageWindow(4, 20)).toEqual([1, 2, 3, 4, 5, "…", 20]);
  });
});

describe("date presets", () => {
  const today = "2026-10-26";

  it("builds the ranges", () => {
    expect(presetRange("all", today)).toEqual({ from: "", to: "" });
    expect(presetRange("7d", today)).toEqual({ from: "2026-10-20", to: "2026-10-26" });
    expect(presetRange("30d", today)).toEqual({ from: "2026-09-27", to: "2026-10-26" });
    expect(presetRange("month", today)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(presetRange("lastMonth", today)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(presetRange("year", today)).toEqual({ from: "2026-01-01", to: "2026-10-26" });
  });

  it("goes back across a year end for last month", () => {
    expect(presetRange("lastMonth", "2027-01-15")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });

  it("uses the real length of February", () => {
    expect(presetRange("month", "2028-02-10").to).toBe("2028-02-29");
  });

  it("recognises which preset is active", () => {
    expect(detectPreset("", "", today)).toBe("all");
    expect(detectPreset("2026-10-01", "2026-10-31", today)).toBe("month");
    expect(detectPreset("2026-10-02", "2026-10-31", today)).toBeNull();
  });

  it("labels ranges", () => {
    expect(formatRangeLabel("", "")).toBe("All time");
    expect(formatRangeLabel("2026-10-01", "2026-10-26")).toBe("Oct 1 – Oct 26");
    expect(formatRangeLabel("2026-10-01", "")).toBe("From Oct 1");
    expect(formatRangeLabel("", "2026-10-26")).toBe("Until Oct 26");
  });
});