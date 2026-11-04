import { describe, expect, it } from "vitest";
import {
  buildInsightRows,
  cleanSetup,
  findHighlights,
  setupSuggestions,
  sortInsightRows,
  tradesInLastDays,
  untaggedShare,
} from "./insights";
import { makeTrade } from "./testHelpers";

describe("cleanSetup", () => {
  it("trims, collapses spaces and names the empty case", () => {
    expect(cleanSetup("  break   out ")).toBe("break out");
    expect(cleanSetup("")).toBe("Untagged");
    expect(cleanSetup("   ")).toBe("Untagged");
  });
});

describe("buildInsightRows", () => {
  const trades = [
    makeTrade({ tag: "Breakout", pnl: 200, rMultiple: 2 }),
    makeTrade({ tag: "breakout ", pnl: -100, rMultiple: -1 }),
    makeTrade({ tag: "Breakout", pnl: 100, rMultiple: 1 }),
    makeTrade({ tag: "Reversal", pnl: -50, rMultiple: null }),
    makeTrade({ tag: "", pnl: 30 }),
  ];

  it("groups setups ignoring case and spacing, and works out the numbers", () => {
    const rows = buildInsightRows(trades, "setup");
    const breakout = rows.find((r) => r.key === "breakout")!;
    expect(breakout.label).toBe("Breakout");
    expect(breakout.trades).toBe(3);
    expect(breakout.wins).toBe(2);
    expect(breakout.losses).toBe(1);
    expect(breakout.winRate).toBeCloseTo(2 / 3, 6);
    expect(breakout.netPnl).toBe(200);
    expect(breakout.expectancy).toBeCloseTo(66.6667, 3);
    expect(breakout.profitFactor).toBe(3);
    expect(breakout.avgR).toBeCloseTo(2 / 3, 6);
    expect(breakout.avgWin).toBe(150);
    expect(breakout.avgLoss).toBe(100);
  });

  it("handles groups with only losses, only wins, only breakeven and no risk set", () => {
    const rows = buildInsightRows(trades, "setup");
    const reversal = rows.find((r) => r.key === "reversal")!;
    expect(reversal.profitFactor).toBe(0);
    expect(reversal.avgR).toBeNull();
    expect(reversal.avgWin).toBeNull();
    expect(reversal.avgLoss).toBe(50);

    const untagged = rows.find((r) => r.label === "Untagged")!;
    expect(untagged.profitFactor).toBe(Number.POSITIVE_INFINITY);
    expect(untagged.avgLoss).toBeNull();

    const flat = buildInsightRows([makeTrade({ tag: "Flat", pnl: 0 })], "setup")[0]!;
    expect(flat.profitFactor).toBeNull();
  });

  it("can group by pair, session and direction", () => {
    const mixed = [
      makeTrade({ pair: "eurusd", session: "London", direction: "long", pnl: 10 }),
      makeTrade({ pair: "EURUSD", session: "Asian", direction: "short", pnl: -5 }),
    ];
    expect(buildInsightRows(mixed, "pair")).toHaveLength(1);
    expect(buildInsightRows(mixed, "pair")[0]!.label).toBe("EURUSD");
    expect(buildInsightRows(mixed, "session").map((r) => r.label).sort()).toEqual([
      "Asian",
      "London",
    ]);
    expect(buildInsightRows(mixed, "direction").map((r) => r.label).sort()).toEqual([
      "Long",
      "Short",
    ]);
  });

  it("uses the most common spelling as the label", () => {
    const rows = buildInsightRows(
      [
        makeTrade({ tag: "pullback" }),
        makeTrade({ tag: "Pullback" }),
        makeTrade({ tag: "Pullback" }),
      ],
      "setup",
    );
    expect(rows[0]!.label).toBe("Pullback");
  });
});

describe("sortInsightRows", () => {
  const rows = buildInsightRows(
    [
      makeTrade({ tag: "A", pnl: 100 }),
      makeTrade({ tag: "B", pnl: 300 }),
      makeTrade({ tag: "B", pnl: -100 }),
      makeTrade({ tag: "C", pnl: -50 }),
    ],
    "setup",
  );

  it("sorts highest first", () => {
    expect(sortInsightRows(rows, "netPnl").map((r) => r.label)).toEqual(["B", "A", "C"]);
    expect(sortInsightRows(rows, "trades").map((r) => r.label)).toEqual(["B", "A", "C"]);
    expect(sortInsightRows(rows, "winRate").map((r) => r.label)).toEqual(["A", "B", "C"]);
    expect(sortInsightRows(rows, "expectancy").map((r) => r.label)).toEqual(["B", "A", "C"]);
  });
});

describe("findHighlights", () => {
  const make = (tag: string, pnls: number[]) => pnls.map((pnl) => makeTrade({ tag, pnl }));

  it("picks the best and weakest setup that have enough trades", () => {
    const rows = buildInsightRows(
      [
        ...make("Breakout", [50, 50, 50, 50, 50]),
        ...make("Reversal", [-20, -20, -20, -20, 10]),
        ...make("Tiny", [1000]),
        ...make("", [500, 500, 500, 500, 500]),
      ],
      "setup",
    );
    const result = findHighlights(rows);
    expect(result?.best.label).toBe("Breakout");
    expect(result?.weakest.label).toBe("Reversal");
  });

  it("needs two setups with enough trades", () => {
    const rows = buildInsightRows(make("Breakout", [1, 2, 3, 4, 5]), "setup");
    expect(findHighlights(rows)).toBeNull();
  });
});

describe("untaggedShare and setupSuggestions", () => {
  const trades = [
    makeTrade({ tag: "Breakout" }),
    makeTrade({ tag: "breakout" }),
    makeTrade({ tag: "Reversal" }),
    makeTrade({ tag: "  " }),
  ];

  it("counts trades with no setup", () => {
    expect(untaggedShare(trades)).toEqual({ count: 1, share: 0.25 });
    expect(untaggedShare([])).toEqual({ count: 0, share: 0 });
  });

  it("suggests setups, most used first, without Untagged", () => {
    expect(setupSuggestions(trades)).toEqual(["Breakout", "Reversal"]);
    expect(setupSuggestions(trades, 1)).toEqual(["Breakout"]);
  });
});

describe("tradesInLastDays", () => {
  const trades = [
    makeTrade({ date: "2026-10-28" }),
    makeTrade({ date: "2026-10-22" }),
    makeTrade({ date: "2026-10-21" }),
    makeTrade({ date: "2026-10-29" }),
  ];

  it("keeps the last N days including today", () => {
    expect(tradesInLastDays(trades, 7, "2026-10-28").map((t) => t.date)).toEqual([
      "2026-10-28",
      "2026-10-22",
    ]);
  });

  it("returns everything when no limit is given", () => {
    expect(tradesInLastDays(trades, null, "2026-10-28")).toHaveLength(4);
  });
});