import type { Trade } from "@/types/trade";

export const NEAR_LIMIT_SHARE = 0.8;
export const MAX_TRADES_PER_DAY_LIMIT = 100;
export const MAX_MONEY_RULE = 1_000_000_000;

export interface RiskRules {
  dailyLossLimit: number | null;
  maxTradesPerDay: number | null;
  monthlyTarget: number | null;
}

export const NO_RISK_RULES: RiskRules = {
  dailyLossLimit: null,
  maxTradesPerDay: null,
  monthlyTarget: null,
};

export function hasAnyRule(rules: RiskRules): boolean {
  return (
    rules.dailyLossLimit !== null || rules.maxTradesPerDay !== null || rules.monthlyTarget !== null
  );
}

export type LimitState = "ok" | "near" | "hit";

export interface LimitMeter {
  limit: number;
  used: number;
  share: number;
  state: LimitState;
}

function meter(limit: number, used: number): LimitMeter {
  const share = limit > 0 ? Math.max(0, used / limit) : 0;
  const state: LimitState = share >= 1 ? "hit" : share >= NEAR_LIMIT_SHARE ? "near" : "ok";
  return { limit, used, share, state };
}

export interface DayRiskStatus {
  date: string;
  pnl: number;
  trades: number;
  loss: LimitMeter | null;
  count: LimitMeter | null;
  worst: LimitState;
}

const STATE_RANK: Record<LimitState, number> = { ok: 0, near: 1, hit: 2 };

export function dayRiskStatus(trades: Trade[], rules: RiskRules, date: string): DayRiskStatus {
  const today = trades.filter((t) => t.date === date);
  const pnl = today.reduce((sum, t) => sum + t.pnl, 0);
  const loss = rules.dailyLossLimit !== null ? meter(rules.dailyLossLimit, Math.max(0, -pnl)) : null;
  const count = rules.maxTradesPerDay !== null ? meter(rules.maxTradesPerDay, today.length) : null;

  let worst: LimitState = "ok";
  for (const m of [loss, count]) {
    if (m && STATE_RANK[m.state] > STATE_RANK[worst]) worst = m.state;
  }
  return { date, pnl, trades: today.length, loss, count, worst };
}

export interface GoalProgress {
  target: number;
  pnl: number
  share: number;
  reached: boolean;
}

export function monthlyGoalProgress(
  trades: Trade[],
  rules: RiskRules,
  month: string,
): GoalProgress | null {
  if (rules.monthlyTarget === null) return null;
  const pnl = trades.filter((t) => t.date.startsWith(month)).reduce((sum, t) => sum + t.pnl, 0);
  const share = Math.min(1, Math.max(0, pnl / rules.monthlyTarget));
  return { target: rules.monthlyTarget, pnl, share, reached: pnl >= rules.monthlyTarget };
}

export function readRiskRules(row: {
  daily_loss_limit?: unknown;
  max_trades_per_day?: unknown;
  monthly_profit_target?: unknown;
} | null | undefined): RiskRules {
  const money = (value: unknown): number | null => {
    const n = typeof value === "string" ? Number(value) : value;
    return typeof n === "number" && Number.isFinite(n) && n > 0 && n <= MAX_MONEY_RULE ? n : null;
  };
  const whole = (value: unknown): number | null => {
    const n = typeof value === "string" ? Number(value) : value;
    return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= MAX_TRADES_PER_DAY_LIMIT
      ? n
      : null;
  };
  return {
    dailyLossLimit: money(row?.daily_loss_limit),
    maxTradesPerDay: whole(row?.max_trades_per_day),
    monthlyTarget: money(row?.monthly_profit_target),
  };
}

export type ParsedRule = { ok: true; value: number | null } | { ok: false; error: string };

export function parseMoneyRule(text: string): ParsedRule {
  const trimmed = text.trim().replace(/^\$/, "").replace(/,/g, "");
  if (trimmed === "") return { ok: true, value: null };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "Enter an amount above 0, or leave it empty." };
  if (n > MAX_MONEY_RULE) return { ok: false, error: "That amount is too large." };
  return { ok: true, value: Math.round(n * 100) / 100 };
}

export function parseCountRule(text: string): ParsedRule {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, value: null };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > MAX_TRADES_PER_DAY_LIMIT) {
    return { ok: false, error: `Enter a whole number from 1 to ${MAX_TRADES_PER_DAY_LIMIT}, or leave it empty.` };
  }
  return { ok: true, value: n };
}