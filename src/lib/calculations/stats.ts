import type { Trade } from "@/types/trade";

export interface EquityPoint {
  tradeId: string;
  date: string;
  cumulativePnl: number;
}

function chronological(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => a.date.localeCompare(b.date));
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