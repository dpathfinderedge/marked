import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EquityCurveChart } from "@/components/stats/EquityCurveChart";
import {
  buildEquitySeries,
  summarizeSeries,
  type EquityRange,
} from "@/lib/calculations";
import type { Trade } from "@/types/trade";
import { toIsoDate, formatShortDate } from "@/utils/dates";
import { formatDollars, formatSignedDollars } from "@/utils/format";

interface EquityCardProps {
  trades: Trade[];
  className?: string;
}

const RANGE_OPTIONS: { value: EquityRange; label: string }[] = [
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "ALL", label: "All" },
];

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

export function EquityCard({ trades, className = "" }: EquityCardProps): JSX.Element {
  const [range, setRange] = useState<EquityRange>("ALL");
  const [showDrawdown, setShowDrawdown] = useState(false);

  const points = useMemo(
    () => buildEquitySeries(trades, range, toIsoDate(new Date())),
    [trades, range],
  );
  const summary = useMemo(() => summarizeSeries(points), [points]);

  const hasTradesInRange = summary.tradingDays > 0;

  return (
    <Card
      title="Equity curve"
      description="Profit and loss over time"
      className={className}
      action={
        <SegmentedControl
          label="Chart range"
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
        />
      }
    >
      {trades.length === 0 ? (
        <div className="flex h-64 items-center justify-center sm:h-72 xl:h-[32rem]">
          <p className="max-w-xs text-center text-sm text-text-muted">
            Your equity curve will show up once you've logged a trade.
          </p>
        </div>
      ) : !hasTradesInRange ? (
        <div className="flex h-64 items-center justify-center sm:h-72 xl:h-[32rem]">
          <p className="max-w-xs text-center text-sm text-text-muted">
            No trades in this range. Pick a longer one to see your curve.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Summary
              label="Profit in range"
              value={formatSignedDollars(summary.rangePnl)}
              tone={summary.rangePnl >= 0 ? "text-signal-green" : "text-signal-red"}
            />
            <Summary
              label="Max drawdown"
              value={summary.maxDrawdown === 0 ? "None" : formatDollars(summary.maxDrawdown)}
              tone={summary.maxDrawdown < 0 ? "text-signal-red" : "text-text"}
            />
            <Summary
              label="Best day"
              value={
                summary.bestDay
                  ? `${formatSignedDollars(summary.bestDay.pnl)} · ${formatShortDate(summary.bestDay.date)}`
                  : "—"
              }
            />
            <Summary
              label="Worst day"
              value={
                summary.worstDay
                  ? `${formatSignedDollars(summary.worstDay.pnl)} · ${formatShortDate(summary.worstDay.date)}`
                  : "—"
              }
            />
          </div>

          <EquityCurveChart points={points} showDrawdown={showDrawdown} />

          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={showDrawdown}
              onChange={(e) => setShowDrawdown(e.target.checked)}
              className="h-3.5 w-3.5 accent-signal-red"
            />
            Show drawdown
          </label>
        </>
      )}
    </Card>
  );
}