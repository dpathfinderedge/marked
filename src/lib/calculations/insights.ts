import type { Trade } from "@/types/trade";
import { addDaysToIso } from "@/utils/dates";

export type InsightDimension = "setup" | "pair" | "session" | "direction";

export const UNTAGGED = "Untagged";

export const MIN_SAMPLE = 5;

export interface InsightRow {
  key: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  expectancy: number;
  profitFactor: number | null;
  avgR: number | null;
  avgWin: number | null;
  avgLoss: number | null;
}

export function cleanSetup(tag: string): string {
  const cleaned = tag.trim().replace(/\s+/g, " ");
  return cleaned === "" ? UNTAGGED : cleaned;
}

function identityOf(trade: Trade, dimension: InsightDimension): { key: string; label: string } {
  switch (dimension) {
    case "setup": {
      const label = cleanSetup(trade.tag);
      return { key: label.toLowerCase(), label };
    }
    case "pair": {
      const label = trade.pair.trim().toUpperCase() || "Unknown";
      return { key: label, label };
    }
    case "session":
      return { key: trade.session, label: trade.session };
    case "direction": {
      const label = trade.direction === "long" ? "Long" : "Short";
      return { key: trade.direction, label };
    }
  }
}

function summarize(key: string, label: string, trades: Trade[]): InsightRow {
  const winners = trades.filter((t) => t.pnl > 0);
  const losers = trades.filter((t) => t.pnl < 0);
  const grossWin = winners.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));
  const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const rValues = trades.flatMap((t) => (t.rMultiple === null ? [] : [t.rMultiple]));

  let profitFactor: number | null = null;
  if (grossLoss > 0) profitFactor = grossWin / grossLoss;
  else if (grossWin > 0) profitFactor = Number.POSITIVE_INFINITY;

  return {
    key,
    label,
    trades: trades.length,
    wins: winners.length,
    losses: losers.length,
    winRate: winners.length / trades.length,
    netPnl,
    expectancy: netPnl / trades.length,
    profitFactor,
    avgR: rValues.length === 0 ? null : rValues.reduce((s, r) => s + r, 0) / rValues.length,
    avgWin: winners.length === 0 ? null : grossWin / winners.length,
    avgLoss: losers.length === 0 ? null : grossLoss / losers.length,
  };
}

export function buildInsightRows(trades: Trade[], dimension: InsightDimension): InsightRow[] {
  const groups = new Map<string, { trades: Trade[]; spellings: Map<string, number> }>();

  for (const trade of trades) {
    const { key, label } = identityOf(trade, dimension);
    const group = groups.get(key) ?? { trades: [], spellings: new Map<string, number>() };
    group.trades.push(trade);
    group.spellings.set(label, (group.spellings.get(label) ?? 0) + 1);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([key, group]) => {
    let label = key;
    let best = -1;
    for (const [spelling, count] of group.spellings) {
      if (count > best) {
        best = count;
        label = spelling;
      }
    }
    return summarize(key, label, group.trades);
  });
}

export type InsightSortKey = "netPnl" | "winRate" | "expectancy" | "trades";

export function sortInsightRows(rows: InsightRow[], by: InsightSortKey): InsightRow[] {
  return [...rows].sort((a, b) => {
    const diff = b[by] - a[by];
    if (diff !== 0) return diff;
    if (b.trades !== a.trades) return b.trades - a.trades;
    return a.label.localeCompare(b.label);
  });
}

export interface Highlights {
  best: InsightRow;
  weakest: InsightRow;
}

export function findHighlights(rows: InsightRow[], minTrades = MIN_SAMPLE): Highlights | null {
  const eligible = rows.filter((r) => r.key !== UNTAGGED.toLowerCase() && r.trades >= minTrades);
  if (eligible.length < 2) return null;
  const ordered = [...eligible].sort((a, b) => b.expectancy - a.expectancy);
  return { best: ordered[0]!, weakest: ordered[ordered.length - 1]! };
}

export function untaggedShare(trades: Trade[]): { count: number; share: number } {
  if (trades.length === 0) return { count: 0, share: 0 };
  const count = trades.filter((t) => cleanSetup(t.tag) === UNTAGGED).length;
  return { count, share: count / trades.length };
}

export function setupSuggestions(trades: Trade[], limit = 12): string[] {
  const rows = buildInsightRows(trades, "setup").filter((r) => r.key !== UNTAGGED.toLowerCase());
  return rows
    .sort((a, b) => b.trades - a.trades || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((r) => r.label);
}

export function tradesInLastDays(trades: Trade[], days: number | null, today: string): Trade[] {
  if (days === null) return trades;
  const first = addDaysToIso(today, -(days - 1));
  return trades.filter((t) => t.date >= first && t.date <= today);
}