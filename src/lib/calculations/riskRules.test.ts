import { describe, expect, it } from "vitest";
import {
  NO_RISK_RULES,
  dayRiskStatus,
  hasAnyRule,
  monthlyGoalProgress,
  parseCountRule,
  parseMoneyRule,
  readRiskRules,
  type RiskRules,
} from "./riskRules";
import { makeTrade } from "./testHelpers";

const rules = (patch: Partial<RiskRules>): RiskRules => ({ ...NO_RISK_RULES, ...patch });
const on = (date: string, pnl: number) => makeTrade({ date, pnl });

describe("dayRiskStatus", () => {
  it("is quiet when no rules are set", () => {
    const status = dayRiskStatus([on("2026-10-30", -500)], NO_RISK_RULES, "2026-10-30");
    expect(status.loss).toBeNull();
    expect(status.count).toBeNull();
    expect(status.worst).toBe("ok");
  });

  it("measures the loss limit against the day's net loss", () => {
    const limit = rules({ dailyLossLimit: 200 });
    const day = (...pnls: number[]) =>
      dayRiskStatus(pnls.map((p) => on("2026-10-30", p)), limit, "2026-10-30");

    expect(day(-100).loss).toMatchObject({ used: 100, share: 0.5, state: "ok" });
    expect(day(-160).loss?.state).toBe("near");
    expect(day(-200).loss?.state).toBe("hit");
    expect(day(-250).loss).toMatchObject({ used: 250, state: "hit" });
    expect(day(100, -250).loss).toMatchObject({ used: 150, state: "ok" });
    expect(day(300).loss).toMatchObject({ used: 0, share: 0, state: "ok" });
  });

  it("counts trades against the cap", () => {
    const cap = rules({ maxTradesPerDay: 5 });
    const day = (n: number) =>
      dayRiskStatus(Array.from({ length: n }, () => on("2026-10-30", 1)), cap, "2026-10-30");
    expect(day(3).count?.state).toBe("ok");
    expect(day(4).count?.state).toBe("near");
    expect(day(5).count?.state).toBe("hit");
    expect(day(7).count?.used).toBe(7);
  });

  it("ignores other days and reports the worst state", () => {
    const status = dayRiskStatus(
      [on("2026-10-29", -900), on("2026-10-30", -50), on("2026-10-30", -10)],
      rules({ dailyLossLimit: 500, maxTradesPerDay: 2 }),
      "2026-10-30",
    );
    expect(status.trades).toBe(2);
    expect(status.pnl).toBe(-60);
    expect(status.loss?.state).toBe("ok");
    expect(status.count?.state).toBe("hit");
    expect(status.worst).toBe("hit");
  });
});

describe("monthlyGoalProgress", () => {
  const trades = [on("2026-09-30", 900), on("2026-10-02", 300), on("2026-10-20", -100)];

  it("is null with no target", () => {
    expect(monthlyGoalProgress(trades, NO_RISK_RULES, "2026-10")).toBeNull();
  });

  it("counts only the month asked for", () => {
    const progress = monthlyGoalProgress(trades, rules({ monthlyTarget: 400 }), "2026-10")!;
    expect(progress).toMatchObject({ pnl: 200, share: 0.5, reached: false });
  });

  it("holds the bar between empty and full", () => {
    expect(monthlyGoalProgress(trades, rules({ monthlyTarget: 100 }), "2026-10")).toMatchObject({
      share: 1,
      reached: true,
    });
    expect(
      monthlyGoalProgress([on("2026-10-02", -50)], rules({ monthlyTarget: 100 }), "2026-10"),
    ).toMatchObject({ share: 0, reached: false });
  });
});

describe("readRiskRules", () => {
  it("reads stored values, including numerics that arrive as strings", () => {
    expect(
      readRiskRules({ daily_loss_limit: "250.50", max_trades_per_day: 4, monthly_profit_target: 1000 }),
    ).toEqual({ dailyLossLimit: 250.5, maxTradesPerDay: 4, monthlyTarget: 1000 });
  });

  it("switches off anything unexpected", () => {
    expect(readRiskRules(null)).toEqual(NO_RISK_RULES);
    expect(
      readRiskRules({ daily_loss_limit: -5, max_trades_per_day: 2.5, monthly_profit_target: "abc" }),
    ).toEqual(NO_RISK_RULES);
    expect(readRiskRules({ max_trades_per_day: 101 }).maxTradesPerDay).toBeNull();
  });
});

describe("hasAnyRule", () => {
  it("is true when at least one rule is set", () => {
    expect(hasAnyRule(NO_RISK_RULES)).toBe(false);
    expect(hasAnyRule(rules({ maxTradesPerDay: 3 }))).toBe(true);
  });
});

describe("parseMoneyRule", () => {
  it("accepts amounts, dollar signs and commas, and treats empty as off", () => {
    expect(parseMoneyRule("")).toEqual({ ok: true, value: null });
    expect(parseMoneyRule("  ")).toEqual({ ok: true, value: null });
    expect(parseMoneyRule("$1,250.5")).toEqual({ ok: true, value: 1250.5 });
    expect(parseMoneyRule("200.999")).toEqual({ ok: true, value: 201 });
  });

  it("rejects zero, negatives, text and huge numbers", () => {
    for (const bad of ["0", "-10", "abc", "1e12"]) {
      expect(parseMoneyRule(bad).ok).toBe(false);
    }
  });
});

describe("parseCountRule", () => {
  it("accepts whole numbers from 1 to 100 and treats empty as off", () => {
    expect(parseCountRule("")).toEqual({ ok: true, value: null });
    expect(parseCountRule("5")).toEqual({ ok: true, value: 5 });
    expect(parseCountRule("100")).toEqual({ ok: true, value: 100 });
  });

  it("rejects zero, decimals and numbers above 100", () => {
    for (const bad of ["0", "2.5", "101", "x"]) {
      expect(parseCountRule(bad).ok).toBe(false);
    }
  });
});