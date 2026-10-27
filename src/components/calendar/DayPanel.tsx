import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Trade } from "@/types/trade";
import { formatWeekdayDate } from "@/utils/dates";
import { formatSignedDollars } from "@/utils/format";

interface DayPanelProps {
  date: string;
  trades: Trade[];
  className?: string;
}

export function DayPanel({ date, trades, className = "" }: DayPanelProps): JSX.Element {
  const ordered = [...trades].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const total = ordered.reduce((sum, t) => sum + t.pnl, 0);
  const wins = ordered.filter((t) => t.pnl > 0).length;
  const losses = ordered.filter((t) => t.pnl < 0).length;

  return (
    <Card className={className}>
      <h2 className="text-sm font-semibold text-text">{formatWeekdayDate(date)}</h2>

      {ordered.length === 0 ? (
        <div className="mt-3 flex flex-col items-start gap-3">
          <p className="text-sm text-text-muted">No trades on this day.</p>
          <Link
            to={`/trades?new=1&date=${date}`}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-bg-2"
          >
            <Plus size={15} />
            Log a trade
          </Link>
        </div>
      ) : (
        <>
          <p
            className={`mt-2 font-mono text-2xl font-semibold tracking-tight ${
              total >= 0 ? "text-signal-green" : "text-signal-red"
            }`}
          >
            {formatSignedDollars(total)}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {ordered.length} trade{ordered.length === 1 ? "" : "s"} · {wins}W {losses}L
          </p>

          <ul className="mt-4 flex flex-col divide-y divide-line border-t border-line">
            {ordered.map((trade) => {
              const isLong = trade.direction === "long";
              const details = [trade.session, trade.tag].filter(Boolean).join(" · ");
              return (
                <li key={trade.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-mono text-sm text-text">
                        {trade.pair}
                      </span>
                      <span
                        className={`flex shrink-0 items-center ${
                          isLong ? "text-signal-green" : "text-signal-red"
                        }`}
                        title={isLong ? "Long" : "Short"}
                      >
                        {isLong ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        <span className="sr-only">{isLong ? "Long" : "Short"}</span>
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-mono text-sm ${
                        trade.pnl >= 0 ? "text-signal-green" : "text-signal-red"
                      }`}
                    >
                      {formatSignedDollars(trade.pnl)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {details}
                    {trade.rMultiple !== null
                      ? `${details ? " · " : ""}${trade.rMultiple.toFixed(1)}R`
                      : ""}
                  </p>
                  {trade.notes ? (
                    <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-xs text-text-faint">
                      {trade.notes}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}