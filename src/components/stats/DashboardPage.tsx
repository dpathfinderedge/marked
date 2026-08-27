import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTrades } from "@/hooks/useTrades";
import { useSettings } from "@/hooks/useSettings";
import { StatCard } from "@/components/ui/StatCard";
import { NotableTradeCard } from "@/components/stats/NotableTradeCard";
import { WeekStrip } from "@/components/stats/WeekStrip";
import { EquityCurveChart } from "@/components/stats/EquityCurveChart";
import { BreakdownTable } from "@/components/stats/BreakdownTable";
import { getTimeOfDayGreeting, getDisplayName } from "@/utils/greeting";
import { toIsoDate } from "@/utils/dates";
import {
  calculateWinRate,
  calculateProfitFactor,
  calculateAverageRMultiple,
  calculateTotalPnl,
  calculateEquityCurve,
  calculateDailyPnl,
  calculateCurrentStreak,
  calculateLargestGain,
  calculateLargestLoss,
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
  const { user } = useAuth();
  const { trades, isLoading } = useTrades();
  const { threshold } = useSettings();

  const stats = useMemo(() => {
    const todayIso = toIsoDate(new Date());
    const todayTrades = trades.filter((t) => t.date === todayIso);

    return {
      winRate: calculateWinRate(trades),
      profitFactor: calculateProfitFactor(trades),
      avgR: calculateAverageRMultiple(trades),
      totalPnl: calculateTotalPnl(trades),
      todayPnl: calculateTotalPnl(todayTrades),
      equityCurve: calculateEquityCurve(trades),
      dailyPnl: calculateDailyPnl(trades),
      currentStreak: calculateCurrentStreak(trades),
      largestGain: calculateLargestGain(trades),
      largestLoss: calculateLargestLoss(trades),
      byPair: breakdownByPair(trades),
      bySession: breakdownBySession(trades),
      byTag: breakdownByTag(trades),
      flaggedCount: detectConsecutiveLossFlags(trades, threshold).size,
    };
  }, [trades, threshold]);

  const greeting = useMemo(() => getTimeOfDayGreeting(), []);
  const displayName = getDisplayName(user);

  if (isLoading) {
    return (
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        Loading…
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text">
          {greeting}
          {displayName ? `, ${displayName}` : ""}.
        </h1>
        <p className="mt-1 font-mono text-sm">
          <span
            className={stats.todayPnl >= 0 ? "text-green" : "text-stamp"}
          >
            {formatSignedDollars(stats.todayPnl)}
          </span>{" "}
          <span className="text-muted">today</span>
        </p>
      </div>

      <WeekStrip dailyPnl={stats.dailyPnl} />

      <EquityCurveChart points={stats.equityCurve} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Current streak"
          value={
            stats.currentStreak.type
              ? `${stats.currentStreak.count}${
                  stats.currentStreak.type === "win" ? "W" : "L"
                }`
              : "—"
          }
          tone={
            stats.currentStreak.type === "win"
              ? "positive"
              : stats.currentStreak.type === "loss"
                ? "negative"
                : "neutral"
          }
        />
        <StatCard
          label="Flagged"
          value={String(stats.flaggedCount)}
          tone={stats.flaggedCount > 0 ? "negative" : "neutral"}
        />
        <NotableTradeCard
          label="Largest gain"
          trade={stats.largestGain}
          tone="positive"
        />
        <NotableTradeCard
          label="Largest loss"
          trade={stats.largestLoss}
          tone="negative"
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