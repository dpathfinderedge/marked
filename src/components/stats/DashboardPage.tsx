import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTrades } from "@/hooks/useTrades";
import { useSettings } from "@/hooks/useSettings";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
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
  const { trades, isLoading, error: tradesError } = useTrades();
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
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        Loading…
      </p>
    );
  }

  const totalIsPositive = stats.totalPnl >= 0;
  const streak = stats.currentStreak;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div>
        <p className="text-sm text-text-muted">
          {greeting}
          {displayName ? `, ${displayName}` : ""}.
        </p>
        {tradesError ? (
          <p className="mt-1 text-xs text-signal-red">
            Couldn't load your trades: {tradesError}
          </p>
        ) : null}
        <p
          className={`mt-2 font-mono text-5xl font-bold tracking-tight sm:text-6xl ${
            totalIsPositive ? "text-signal-green" : "text-signal-red"
          }`}
        >
          {formatSignedDollars(stats.totalPnl)}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <span>
            <span
              className={
                stats.todayPnl >= 0 ? "text-signal-green" : "text-signal-red"
              }
            >
              {formatSignedDollars(stats.todayPnl)}
            </span>{" "}
            today
          </span>
          {streak.type ? (
            <>
              <span className="text-line-strong">·</span>
              <span>
                <span
                  className={
                    streak.type === "win" ? "text-signal-green" : "text-signal-red"
                  }
                >
                  {streak.count}
                  {streak.type === "win" ? "W" : "L"}
                </span>{" "}
                current streak
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 xl:gap-8">
        <Card title="Equity curve" className="xl:col-span-2">
          <EquityCurveChart points={stats.equityCurve} />
        </Card>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1 xl:gap-8">
          <Card title="This week">
            <WeekStrip dailyPnl={stats.dailyPnl} />
          </Card>

          <Card title="Performance">
            <div className="grid grid-cols-2 gap-3">
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
          </Card>

          <Card title="Notable trades" className="sm:col-span-2 xl:col-span-1">
            <div className="grid grid-cols-2 gap-3">
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
          </Card>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
        <BreakdownTable title="By pair" groups={stats.byPair} />
        <BreakdownTable title="By session" groups={stats.bySession} />
        <div className="sm:col-span-2 xl:col-span-1">
          <BreakdownTable title="By tag" groups={stats.byTag} />
        </div>
      </div>
    </div>
  );
}