import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTrades } from "@/hooks/useTrades";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { DayPanel } from "@/components/calendar/DayPanel";
import { buildMonthGrid, summarizeMonth } from "@/lib/calculations";
import {
  formatMonthLabel,
  isValidIsoDate,
  monthOfIso,
  shiftMonth,
  toIsoDate,
} from "@/utils/dates";
import { formatSignedDollars } from "@/utils/format";

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-line text-text-muted transition-colors hover:bg-bg-2 hover:text-text";

function Summary({
  label,
  value,
  tone = "text-text",
}: {
  label: string;
  value: string;
  tone?: string;
}): JSX.Element {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-0.5 font-mono text-sm font-medium ${tone}`}>{value}</p>
    </div>
  );
}

export function CalendarPage(): JSX.Element {
  const { trades, isLoading, error } = useTrades();
  const [searchParams, setSearchParams] = useSearchParams();

  const today = toIsoDate(new Date());
  const dateParam = searchParams.get("date");
  const selected = dateParam && isValidIsoDate(dateParam) ? dateParam : today;

  const [monthOverride, setMonthOverride] = useState<{
    forDate: string;
    month: string;
  } | null>(null);
  const viewMonth =
    monthOverride && monthOverride.forDate === selected
      ? monthOverride.month
      : monthOfIso(selected);

  const weeks = useMemo(() => buildMonthGrid(viewMonth, trades), [viewMonth, trades]);
  const summary = useMemo(() => summarizeMonth(weeks), [weeks]);
  const selectedTrades = useMemo(
    () => trades.filter((t) => t.date === selected),
    [trades, selected],
  );

  const selectDate = (date: string): void => {
    setSearchParams({ date }, { replace: true });
  };

  const moveMonth = (delta: number): void => {
    setMonthOverride({ forDate: selected, month: shiftMonth(viewMonth, delta) });
  };

  const goToToday = (): void => {
    setMonthOverride(null);
    selectDate(today);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 lg:gap-8" role="status" aria-label="Loading your calendar">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
          <Skeleton className="h-[34rem]" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Calendar"
        description="Your results day by day. Pick a day to see its trades."
      />

      {error ? (
        <p className="text-xs text-signal-red">Couldn't load your trades: {error}</p>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
        <Card>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-text">
              {formatMonthLabel(viewMonth)}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToToday}
                className="h-8 rounded-lg border border-line px-3 text-xs font-medium text-text-muted transition-colors hover:bg-bg-2 hover:text-text"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="Previous month"
                className={ICON_BUTTON}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="Next month"
                className={ICON_BUTTON}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Summary
              label="Month P&L"
              value={summary.trades > 0 ? formatSignedDollars(summary.pnl) : "—"}
              tone={
                summary.pnl > 0
                  ? "text-signal-green"
                  : summary.pnl < 0
                    ? "text-signal-red"
                    : "text-text"
              }
            />
            <Summary label="Trades" value={String(summary.trades)} />
            <Summary label="Trading days" value={String(summary.tradingDays)} />
            <Summary
              label="Green / red days"
              value={`${summary.greenDays} / ${summary.redDays}`}
            />
          </div>

          <MonthGrid
            weeks={weeks}
            maxAbsDay={summary.maxAbsDay}
            selected={selected}
            today={today}
            onSelect={selectDate}
          />

          {trades.length === 0 ? (
            <p className="mt-5 text-sm text-text-muted">
              Days fill in with colour as you log trades.
            </p>
          ) : null}
        </Card>

        <DayPanel
          date={selected}
          trades={selectedTrades}
          className="xl:sticky xl:top-7"
        />
      </div>
    </div>
  );
}