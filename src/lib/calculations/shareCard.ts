import type { Trade } from "@/types/trade";
import { formatMonthLabel, monthOfIso } from "@/utils/dates";
import { tradesInLastDays } from "@/lib/calculations/insights";
import {
  calculateAverageRMultiple,
  calculateProfitFactor,
  calculateTotalPnl,
  calculateWinRate,
} from "@/lib/calculations/stats";
import { chronological } from "@/lib/calculations/chronological";

export type SharePeriod = "month" | "30d" | "90d" | "all";

export const SHARE_PERIODS: { value: SharePeriod; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export const MAX_CURVE_POINTS = 120;

export function tradesForPeriod(trades: Trade[], period: SharePeriod, today: string): Trade[] {
  switch (period) {
    case "month": {
      const month = monthOfIso(today);
      return trades.filter((t) => t.date.startsWith(month) && t.date <= today);
    }
    case "30d":
      return tradesInLastDays(trades, 30, today);
    case "90d":
      return tradesInLastDays(trades, 90, today);
    case "all":
      return trades.filter((t) => t.date <= today);
  }
}

export function periodLabel(period: SharePeriod, today: string): string {
  switch (period) {
    case "month":
      return formatMonthLabel(monthOfIso(today));
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
    case "all":
      return "All time";
  }
}

export function downsample(values: number[], max: number): number[] {
  if (values.length <= max || max < 2) return values;
  const result: number[] = [];
  for (let i = 0; i < max; i++) {
    result.push(values[Math.round((i * (values.length - 1)) / (max - 1))]!);
  }
  return result;
}

/** What the big number on the card says. */
export type HeroKind = "pnl" | "totalR" | "winRate";

export interface ShareCardData {
  periodLabel: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  profitFactor: number | null;
  averageR: number | null;
  hero: { kind: HeroKind; value: number };
  curve: number[];
  showDollars: boolean;
}

export interface ShareCardOptions {
  period: SharePeriod;
  showDollars: boolean;
  today: string;
}

export function buildShareCard(trades: Trade[], options: ShareCardOptions): ShareCardData | null {
  const inPeriod = tradesForPeriod(trades, options.period, options.today);
  if (inPeriod.length === 0) return null;

  const withR = inPeriod.filter((t): t is Trade & { rMultiple: number } => t.rMultiple !== null);
  const totalR = withR.reduce((sum, t) => sum + t.rMultiple, 0);
  const winRate = calculateWinRate(inPeriod);

  let hero: ShareCardData["hero"];
  if (options.showDollars) hero = { kind: "pnl", value: calculateTotalPnl(inPeriod) };
  else if (withR.length > 0) hero = { kind: "totalR", value: totalR };
  else hero = { kind: "winRate", value: winRate ?? 0 };

  let running = 0;
  const curve = [0, ...chronological(inPeriod).map((t) => (running += t.pnl))];

  return {
    periodLabel: periodLabel(options.period, options.today),
    trades: inPeriod.length,
    wins: inPeriod.filter((t) => t.pnl > 0).length,
    losses: inPeriod.filter((t) => t.pnl < 0).length,
    winRate,
    profitFactor: calculateProfitFactor(inPeriod),
    averageR: calculateAverageRMultiple(inPeriod),
    hero,
    curve: downsample(curve, MAX_CURVE_POINTS),
    showDollars: options.showDollars,
  };
}