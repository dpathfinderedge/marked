import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Trade } from "@/types/trade";
import { formatShortDate } from "@/utils/dates";
import { formatSignedDollars } from "@/utils/format";

interface RecentTradesCardProps {
  trades: Trade[];
  limit?: number;
  className?: string;
}

export function RecentTradesCard({
  trades,
  limit = 6,
  className = "",
}: RecentTradesCardProps): JSX.Element {
  const recent = trades.slice(0, limit);

  return (
    <Card
      title="Recent trades"
      className={className}
      action={
        <Link
          to="/trades"
          className="text-xs font-medium text-text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
        >
          View all
        </Link>
      }
    >
      {recent.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          Trades you log will show up here.
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {recent.map((trade) => {
            const isLong = trade.direction === "long";
            return (
              <li
                key={trade.id}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-2 py-2.5 text-sm hover:bg-bg-2/60 sm:grid-cols-[4.5rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_3.5rem_6rem]"
              >
                <span className="text-xs text-text-muted">
                  {formatShortDate(trade.date)}
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-mono text-text">{trade.pair}</span>
                  <span
                    className={`flex shrink-0 items-center text-xs ${
                      isLong ? "text-signal-green" : "text-signal-red"
                    }`}
                    title={isLong ? "Long" : "Short"}
                  >
                    {isLong ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    <span className="sr-only">{isLong ? "Long" : "Short"}</span>
                  </span>
                </span>
                <span className="hidden truncate text-xs text-text-muted sm:block">
                  {trade.session}
                </span>
                <span className="hidden truncate text-xs text-text-muted sm:block">
                  {trade.tag || "—"}
                </span>
                <span className="hidden text-right font-mono text-xs text-text-muted sm:block">
                  {trade.rMultiple !== null ? `${trade.rMultiple.toFixed(1)}R` : "—"}
                </span>
                <span
                  className={`text-right font-mono ${
                    trade.pnl >= 0 ? "text-signal-green" : "text-signal-red"
                  }`}
                >
                  {formatSignedDollars(trade.pnl)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}