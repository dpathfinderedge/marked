import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { InsightsTable } from "@/components/insights/InsightsTable";
import { useStoredState } from "@/hooks/useStoredState";
import { useSubscription } from "@/hooks/useSubscription";
import { useTrades } from "@/hooks/useTrades";
import {
  MIN_SAMPLE,
  buildInsightRows,
  findHighlights,
  sortInsightRows,
  tradesInLastDays,
  untaggedShare,
  type InsightDimension,
  type InsightRow,
  type InsightSortKey,
} from "@/lib/calculations";
import { toIsoDate } from "@/utils/dates";
import { formatSignedDollars } from "@/utils/format";

type RangeKey = "30" | "90" | "all";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all", label: "All time" },
];

const DIMENSION_OPTIONS: { value: InsightDimension; label: string }[] = [
  { value: "setup", label: "Setup" },
  { value: "pair", label: "Pair" },
  { value: "session", label: "Session" },
  { value: "direction", label: "Direction" },
];

const DIMENSION_NOUN: Record<InsightDimension, string> = {
  setup: "setup",
  pair: "pair",
  session: "session",
  direction: "direction",
};

function readRange(value: string): RangeKey {
  return value === "30" || value === "90" ? value : "all";
}

function Highlight({ title, row }: { title: string; row: InsightRow }): JSX.Element {
  return (
    <Card>
      <p className="text-xs text-text-muted">{title}</p>
      <p className="mt-1 truncate text-base font-semibold text-text sm:text-lg">{row.label}</p>
      <p
        className={`mt-1 font-mono text-xl font-semibold tracking-tight sm:text-2xl ${
          row.expectancy >= 0 ? "text-signal-green" : "text-signal-red"
        }`}
      >
        {formatSignedDollars(row.expectancy, 0)}
        <span className="block text-xs font-normal text-text-muted sm:ml-1.5 sm:inline sm:text-sm">
          per trade
        </span>
      </p>
      <p className="mt-1.5 text-xs text-text-muted">
        {row.trades} trades · {(row.winRate * 100).toFixed(0)}% win rate
      </p>
    </Card>
  );
}

function InsightsSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading insights">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

export function InsightsPage(): JSX.Element {
  const { trades, isLoading } = useTrades();
  const { isPro, isLoading: isPlanLoading } = useSubscription();
  const [rangeValue, setRangeValue] = useStoredState("marked-insights-range", "all");
  const [dimension, setDimension] = useState<InsightDimension>("setup");
  const [sortBy, setSortBy] = useState<InsightSortKey>("netPnl");

  const range = readRange(rangeValue);
  const today = toIsoDate(new Date());

  const inRange = useMemo(
    () => tradesInLastDays(trades, range === "all" ? null : Number(range), today),
    [trades, range, today],
  );
  const rows = useMemo(
    () => sortInsightRows(buildInsightRows(inRange, dimension), sortBy),
    [inRange, dimension, sortBy],
  );
  const highlights = useMemo(
    () => findHighlights(buildInsightRows(inRange, "setup")),
    [inRange],
  );
  const untagged = useMemo(() => untaggedShare(inRange), [inRange]);

  if (isLoading || isPlanLoading) return <InsightsSkeleton />;

  const header = (
    <PageHeader
      title="Insights"
      description="See which setups, pairs and sessions pay you, and which don't."
      actions={
        isPro ? (
          <SegmentedControl
            label="Time range"
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRangeValue}
          />
        ) : null
      }
    />
  );

  if (!isPro) {
    return (
      <div className="flex flex-col gap-6 lg:gap-8">
        {header}
        <Card className="max-w-2xl">
          <h2 className="text-sm font-semibold text-text">Find out what's working</h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-text-muted">
            <li>Win rate, average R, profit factor and net P&L for every setup you trade.</li>
            <li>Your best and weakest setup, once each has enough trades to compare.</li>
            <li>The same breakdown by pair, session and long versus short.</li>
          </ul>
          <div className="mt-4">
            <UpgradePrompt feature="Insights" />
          </div>
        </Card>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col gap-6 lg:gap-8">
        {header}
        <Card className="max-w-2xl">
          <p className="text-sm text-text-muted">
            Insights appear once you've logged some trades. Give each trade a setup, like
            "Breakout" or "Pullback", and you'll see which ones pay.
          </p>
          <Link
            to="/trades?new=1"
            className="mt-3 inline-block text-sm font-medium text-signal-red underline underline-offset-4"
          >
            Log a trade
          </Link>
        </Card>
      </div>
    );
  }

  const showNudge = dimension === "setup" && untagged.count > 0 && untagged.share >= 0.25;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {header}

      {inRange.length === 0 ? (
        <Card className="max-w-2xl">
          <p className="text-sm text-text-muted">
            No trades in this time range. Try a longer one.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {highlights ? (
              <>
                <Highlight title="Best setup, per trade" row={highlights.best} />
                <Highlight title="Weakest setup, per trade" row={highlights.weakest} />
              </>
            ) : (
              <Card className="col-span-2">
                <p className="text-sm text-text-muted">
                  Once two setups have at least {MIN_SAMPLE} trades each, your best and weakest
                  show up here.
                </p>
              </Card>
            )}
            <Card className="col-span-2 md:col-span-1">
              <p className="text-xs text-text-muted">Trades with a setup</p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-text">
                {inRange.length - untagged.count}
                <span className="text-base font-normal text-text-muted"> of {inRange.length}</span>
              </p>
              <p className="mt-1.5 text-xs text-text-muted">
                {untagged.count === 0
                  ? "Every trade has a setup."
                  : "Add a setup to the rest in the Trades log."}
              </p>
            </Card>
          </div>

          <Card className="!p-0">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pb-4 pt-5">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-text">
                  Performance by {DIMENSION_NOUN[dimension]}
                </h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  {inRange.length} trade{inRange.length === 1 ? "" : "s"} · "Per trade" is the
                  average profit or loss each time you take it.
                </p>
              </div>
              <SegmentedControl
                label="Group by"
                options={DIMENSION_OPTIONS}
                value={dimension}
                onChange={setDimension}
              />
            </div>
            {showNudge ? (
              <p className="mx-5 mb-4 rounded-lg border border-line bg-bg-2/60 px-3 py-2 text-xs text-text-muted">
                {untagged.count} of {inRange.length} trades have no setup, so they're grouped as
                "Untagged". Tag them to see which setups really work.
              </p>
            ) : null}
            <InsightsTable rows={rows} sortBy={sortBy} onSortChange={setSortBy} />
          </Card>
        </>
      )}
    </div>
  );
}