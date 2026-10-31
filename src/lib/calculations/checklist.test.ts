import { describe, expect, it } from "vitest";
import {
  MAX_CHECKLIST_ITEMS,
  MAX_CHECKLIST_ITEM_LENGTH,
  MAX_RECAP_LENGTH,
  adherenceStats,
  checklistOutcome,
  cleanChecklistItems,
  cleanRecap,
  hasEnoughToCompare,
  readChecklistItems,
} from "./checklist";
import { makeTrade } from "./testHelpers";

describe("cleanChecklistItems", () => {
  it("trims, squeezes spaces and drops blanks and repeats", () => {
    expect(
      cleanChecklistItems(["  Trend   agrees ", "", "   ", "trend agrees", "Stop is set"]),
    ).toEqual(["Trend agrees", "Stop is set"]);
  });

  it("shortens long rules and keeps only ten", () => {
    const long = "x".repeat(200);
    expect(cleanChecklistItems([long])[0]).toHaveLength(MAX_CHECKLIST_ITEM_LENGTH);
    const many = Array.from({ length: 15 }, (_, i) => `Rule ${i}`);
    expect(cleanChecklistItems(many)).toHaveLength(MAX_CHECKLIST_ITEMS);
  });
});

describe("readChecklistItems", () => {
  it("reads a stored list and ignores anything else", () => {
    expect(readChecklistItems(["A", " B ", 3, null])).toEqual(["A", "B"]);
    expect(readChecklistItems(null)).toEqual([]);
    expect(readChecklistItems({ a: 1 })).toEqual([]);
    expect(readChecklistItems("A")).toEqual([]);
  });
});

describe("cleanRecap", () => {
  it("trims and caps the length", () => {
    expect(cleanRecap("  Stuck to the plan.  ")).toBe("Stuck to the plan.");
    expect(cleanRecap("y".repeat(MAX_RECAP_LENGTH + 50))).toHaveLength(MAX_RECAP_LENGTH);
  });
});

describe("checklistOutcome", () => {
  it("describes how a trade did", () => {
    expect(checklistOutcome({ checklistPassed: 4, checklistTotal: 4 })).toBe("all");
    expect(checklistOutcome({ checklistPassed: 2, checklistTotal: 4 })).toBe("some");
    expect(checklistOutcome({ checklistPassed: 0, checklistTotal: 4 })).toBe("none");
    expect(checklistOutcome({ checklistPassed: null, checklistTotal: null })).toBe("unused");
    expect(checklistOutcome({ checklistPassed: 1, checklistTotal: null })).toBe("unused");
  });
});

describe("adherenceStats", () => {
  const trade = (passed: number | null, total: number | null, pnl: number) =>
    makeTrade({ checklistPassed: passed, checklistTotal: total, pnl });

  it("compares followed trades with skipped ones", () => {
    const result = adherenceStats([
      trade(3, 3, 100),
      trade(3, 3, 50),
      trade(3, 3, -30),
      trade(2, 3, -80),
      trade(0, 3, -40),
      trade(null, null, 500),
    ])!;
    expect(result.followed).toEqual({
      trades: 3,
      winRate: 2 / 3,
      netPnl: 120,
      expectancy: 40,
    });
    expect(result.skipped).toEqual({ trades: 2, winRate: 0, netPnl: -120, expectancy: -60 });
    expect(result.unused).toBe(1);
  });

  it("is null until a checklist has been used", () => {
    expect(adherenceStats([trade(null, null, 10)])).toBeNull();
    expect(adherenceStats([])).toBeNull();
  });

  it("allows one group to be empty", () => {
    const result = adherenceStats([trade(2, 2, 10)])!;
    expect(result.skipped).toBeNull();
    expect(result.followed?.trades).toBe(1);
  });
});

describe("hasEnoughToCompare", () => {
  const group = (trades: number) => ({ trades, winRate: 0.5, netPnl: 0, expectancy: 0 });
  it("needs three trades on each side", () => {
    expect(hasEnoughToCompare({ followed: group(3), skipped: group(3), unused: 0 })).toBe(true);
    expect(hasEnoughToCompare({ followed: group(2), skipped: group(5), unused: 0 })).toBe(false);
    expect(hasEnoughToCompare({ followed: group(5), skipped: null, unused: 0 })).toBe(false);
  });
});