import type { Trade } from "@/types/trade";
import { chronological } from "@/lib/calculations/chronological";

export interface EquityPoint {
  tradeId: string;
  date: string;
  cumulativePnl: number;
}

export function calculateWinRate(trades: Trade[]): number | null {
  if (trades.length === 0) return null;
  const wins = trades.filter((t) => t.pnl > 0).length;
  return wins / trades.length;
}

export function calculateProfitFactor(trades: Trade[]): number | null {
  const grossWin = trades
    .filter((t) => t.pnl > 0)
    .reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0),
  );

  if (grossLoss === 0) return grossWin > 0 ? null : null;
  return grossWin / grossLoss;
}

export function calculateAverageRMultiple(trades: Trade[]): number | null {
  const withRisk = trades.filter(
    (t): t is Trade & { rMultiple: number } => t.rMultiple !== null,
  );
  if (withRisk.length === 0) return null;
  return withRisk.reduce((sum, t) => sum + t.rMultiple, 0) / withRisk.length;
}

export function calculateTotalPnl(trades: Trade[]): number {
  return trades.reduce((sum, t) => sum + t.pnl, 0);
}

export function calculateEquityCurve(trades: Trade[]): EquityPoint[] {
  let cumulative = 0;
  return chronological(trades).map((trade) => {
    cumulative += trade.pnl;
    return { tradeId: trade.id, date: trade.date, cumulativePnl: cumulative };
  });
}

export interface GroupStats {
  key: string;
  trades: number;
  winRate: number | null;
  totalPnl: number;
}

function groupBy(trades: Trade[], keyFn: (t: Trade) => string): GroupStats[] {
  const groups = new Map<string, Trade[]>();
  for (const trade of trades) {
    const key = keyFn(trade);
    const existing = groups.get(key);
    if (existing) existing.push(trade);
    else groups.set(key, [trade]);
  }

  return Array.from(groups.entries())
    .map(([key, groupTrades]) => ({
      key,
      trades: groupTrades.length,
      winRate: calculateWinRate(groupTrades),
      totalPnl: calculateTotalPnl(groupTrades),
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl);
}

export function breakdownByPair(trades: Trade[]): GroupStats[] {
  return groupBy(trades, (t) => t.pair);
}

export function breakdownBySession(trades: Trade[]): GroupStats[] {
  return groupBy(trades, (t) => t.session);
}

export function breakdownByTag(trades: Trade[]): GroupStats[] {
  return groupBy(trades, (t) => t.tag || "Untagged");
}

export function calculateDailyPnl(trades: Trade[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const trade of trades) {
    map.set(trade.date, (map.get(trade.date) ?? 0) + trade.pnl);
  }
  return map;
}

export interface CurrentStreak {
  count: number;
  type: "win" | "loss" | null;
}

function outcome(pnl: number): "win" | "loss" | "breakeven" {
  if (pnl > 0) return "win";
  if (pnl < 0) return "loss";
  return "breakeven";
}

export function calculateCurrentStreak(trades: Trade[]): CurrentStreak {
  const sorted = chronological(trades);
  if (sorted.length === 0) return { count: 0, type: null };

  const lastTrade = sorted[sorted.length - 1];
  if (!lastTrade) return { count: 0, type: null };

  const lastOutcome = outcome(lastTrade.pnl);
  if (lastOutcome === "breakeven") return { count: 0, type: null };

  let count = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const trade = sorted[i];
    if (trade && outcome(trade.pnl) === lastOutcome) count++;
    else break;
  }

  return { count, type: lastOutcome };
}

export interface NotableTrade {
  tradeId: string;
  pair: string;
  pnl: number;
  date: string;
}

export function calculateLargestGain(trades: Trade[]): NotableTrade | null {
  const winners = trades.filter((t) => t.pnl > 0);
  if (winners.length === 0) return null;

  const best = winners.reduce((max, t) => (t.pnl > max.pnl ? t : max));
  return { tradeId: best.id, pair: best.pair, pnl: best.pnl, date: best.date };
}

export function calculateLargestLoss(trades: Trade[]): NotableTrade | null {
  const losers = trades.filter((t) => t.pnl < 0);
  if (losers.length === 0) return null;

  const worst = losers.reduce((min, t) => (t.pnl < min.pnl ? t : min));
  return {
    tradeId: worst.id,
    pair: worst.pair,
    pnl: worst.pnl,
    date: worst.date,
  };
}