import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrades } from "@/hooks/useTrades";
import { useSettings } from "@/hooks/useSettings";
import { useSubscription } from "@/hooks/useSubscription";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { KpiTile } from "@/components/stats/KpiTile";
import { EquityCard } from "@/components/stats/EquityCard";
import { WeekStrip } from "@/components/stats/WeekStrip";
import { NotableTradeCard } from "@/components/stats/NotableTradeCard";
import { WeekdayCard } from "@/components/stats/WeekdayCard";
import { BreakdownCard } from "@/components/stats/BreakdownCard";
import { RecentTradesCard } from "@/components/stats/RecentTradesCard";
import { getTimeOfDayGreeting, getDisplayName } from "@/utils/greeting";
import { toIsoDate } from "@/utils/dates";
import { formatSignedDollars } from "@/utils/format";
import {
  calculateWinRate,
  calculateProfitFactor,
  calculateAverageRMultiple,
  calculateTotalPnl,
  calculateDailyPnl,
  calculateCurrentStreak,
  calculateLargestGain,
  calculateLargestLoss,
  calculateWeekdayPnl,
  countTradesThisMonth,
  breakdownByPair,
  breakdownBySession,
  breakdownByTag,
  detectConsecutiveLossFlags,
  FREE_TRADE_LIMIT,
} from "@/lib/calculations";

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(0)}%`;
}

function formatRatio(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function DashboardSkeleton(): JSX.Element {
  return (
    <div
      className="flex flex-col gap-6 lg:gap-8"
      role="status"
      aria-label="Loading your dashboard"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3 xl:gap-8">
        <Skeleton className="h-96 xl:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const { trades, isLoading, error: tradesError } = useTrades();
  const { threshold } = useSettings();
  const { isPro } = useSubscription();

  const stats = useMemo(() => {
    const todayIso = toIsoDate(new Date());
    const todayTrades = trades.filter((t) => t.date === todayIso);

    return {
      winRate: calculateWinRate(trades),
      wins: trades.filter((t) => t.pnl > 0).length,
      losses: trades.filter((t) => t.pnl < 0).length,
      profitFactor: calculateProfitFactor(trades),
      avgR: calculateAverageRMultiple(trades),
      tradesWithRisk: trades.filter((t) => t.rMultiple !== null).length,
      totalPnl: calculateTotalPnl(trades),
      todayPnl: calculateTotalPnl(todayTrades),
      tradesThisMonth: countTradesThisMonth(trades),
      dailyPnl: calculateDailyPnl(trades),
      currentStreak: calculateCurrentStreak(trades),
      largestGain: calculateLargestGain(trades),
      largestLoss: calculateLargestLoss(trades),
      weekday: calculateWeekdayPnl(trades),
      byPair: breakdownByPair(trades),
      bySession: breakdownBySession(trades),
      byTag: breakdownByTag(trades),
      flaggedCount: detectConsecutiveLossFlags(trades, threshold).size,
    };
  }, [trades, threshold]);

  const greeting = useMemo(() => getTimeOfDayGreeting(), []);
  const displayName = getDisplayName(user);

  if (isLoading) return <DashboardSkeleton />;

  const streak = stats.currentStreak;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title={`${greeting}${displayName ? `, ${displayName}` : ""}.`}
        description={
          trades.length === 0 ? (
            "Here's where your journal will take shape."
          ) : (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
                  <span className="text-line-strong" aria-hidden="true">
                    ·
                  </span>
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
            </span>
          )
        }
        actions={
          <Link
            to="/trades"
            className="flex items-center gap-1.5 rounded-lg bg-signal-red px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Log trade
          </Link>
        }
      />

      {tradesError ? (
        <p className="text-xs text-signal-red">
          Couldn't load your trades: {tradesError}
        </p>
      ) : null}

      {trades.length === 0 ? (
        <Card>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text">
                Log your first trade
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Your equity curve, win rate and breakdowns fill in as you add
                trades.
              </p>
            </div>
            <Link
              to="/trades"
              className="shrink-0 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-text transition-colors hover:bg-bg-2"
            >
              Go to Trades
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          label="Net P&L"
          value={formatSignedDollars(
            stats.totalPnl,
            Math.abs(stats.totalPnl) >= 10_000 ? 0 : 2,
          )}
          tone={stats.totalPnl >= 0 ? "positive" : "negative"}
          sub="Since your first trade"
        />
        <KpiTile
          label="Win rate"
          value={formatPercent(stats.winRate)}
          sub={`${stats.wins}W · ${stats.losses}L`}
        />
        <KpiTile
          label="Profit factor"
          value={formatRatio(stats.profitFactor)}
          sub="Wins ÷ losses"
        />
        <KpiTile
          label="Average R"
          value={formatRatio(stats.avgR)}
          sub={`${stats.tradesWithRisk} with risk set`}
        />
        <KpiTile
          label="Trades"
          value={String(trades.length)}
          sub={
            isPro
              ? `${stats.tradesThisMonth} this month`
              : `${stats.tradesThisMonth}/${FREE_TRADE_LIMIT} this month`
          }
        />
        <KpiTile
          label="Flagged"
          value={String(stats.flaggedCount)}
          tone={stats.flaggedCount > 0 ? "negative" : "neutral"}
          sub="After losing streaks"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3 xl:gap-8">
        <EquityCard trades={trades} className="xl:col-span-2" />

        <div className="grid content-start gap-6 sm:grid-cols-2 xl:grid-cols-1 xl:gap-8">
          <Card title="This week">
            <WeekStrip dailyPnl={stats.dailyPnl} />
          </Card>

          <Card title="Notable trades">
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

          <WeekdayCard
            stats={stats.weekday}
            className="sm:col-span-2 xl:col-span-1"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 xl:gap-8">
        <RecentTradesCard trades={trades} className="xl:col-span-2" />
        <BreakdownCard
          byPair={stats.byPair}
          bySession={stats.bySession}
          byTag={stats.byTag}
        />
      </div>
    </div>
  );
}