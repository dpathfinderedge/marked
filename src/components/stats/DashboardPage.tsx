import { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useSettings } from "@/hooks/useSettings";
import { StatCard } from "@/components/ui/StatCard";
import { EquityCurveChart } from "@/components/stats/EquityCurveChart";
import { BreakdownTable } from "@/components/stats/BreakdownTable";
import {
  calculateWinRate,
  calculateProfitFactor,
  calculateAverageRMultiple,
  calculateTotalPnl,
  calculateEquityCurve,
  breakdownByPair,
  breakdownBySession,
  breakdownByTag,
  detectConsecutiveLossFlags,
} from "@/lib/calculations";

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(0)}%`;
}

function formatRatio(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function formatSignedDollars(value: number): string {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function DashboardPage(): JSX.Element {
  const { trades, isLoading } = useTrades();
  const { threshold } = useSettings();

  const stats = useMemo(
    () => ({
      winRate: calculateWinRate(trades),
      profitFactor: calculateProfitFactor(trades),
      avgR: calculateAverageRMultiple(trades),
      totalPnl: calculateTotalPnl(trades),
      equityCurve: calculateEquityCurve(trades),
      byPair: breakdownByPair(trades),
      bySession: breakdownBySession(trades),
      byTag: breakdownByTag(trades),
      flaggedCount: detectConsecutiveLossFlags(trades, threshold).size,
    }),
    [trades, threshold],
  );

  if (isLoading) {
    return (
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        Loading…
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="font-display text-2xl italic text-ink">Dashboard</h1>

      <EquityCurveChart points={stats.equityCurve} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard
          label="Total P&L"
          value={formatSignedDollars(stats.totalPnl)}
          tone={stats.totalPnl >= 0 ? "positive" : "negative"}
        />
        <StatCard label="Win rate" value={formatPercent(stats.winRate)} />
        <StatCard
          label="Profit factor"
          value={formatRatio(stats.profitFactor)}
        />
        <StatCard label="Avg R" value={formatRatio(stats.avgR)} />
        <StatCard
          label="Flagged"
          value={String(stats.flaggedCount)}
          tone={stats.flaggedCount > 0 ? "negative" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BreakdownTable title="By pair" groups={stats.byPair} />
        <BreakdownTable title="By session" groups={stats.bySession} />
        <BreakdownTable title="By tag" groups={stats.byTag} />
      </div>
    </div>
  );
}