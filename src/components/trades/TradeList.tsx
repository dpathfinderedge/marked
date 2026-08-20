import type { Trade } from "@/types/trade";

interface TradeListProps {
  trades: Trade[];
  isLoading: boolean;
}

function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "−";
  return `${sign}${Math.abs(pnl).toFixed(2)}`;
}

export function TradeList({ trades, isLoading }: TradeListProps): JSX.Element {
  if (isLoading) {
    return (
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        Loading…
      </p>
    );
  }

  if (trades.length === 0) {
    return (
      <p className="font-sans text-sm text-muted">
        No trades logged yet. Your first entry will show up here.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-surface">
      {trades.map((trade) => (
        <div
          key={trade.id}
          className="flex items-center justify-between border-b border-rule px-4 py-3 last:border-b-0"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-sm font-medium text-ink">
              {trade.pair}
            </span>
            <span className="font-mono text-xs text-muted">
              {trade.date} · {trade.session}
              {trade.tag ? ` · ${trade.tag}` : ""}
            </span>
          </div>
          <span
            className={`font-mono text-sm font-medium ${
              trade.pnl >= 0 ? "text-green" : "text-stamp"
            }`}
          >
            {formatPnl(trade.pnl)}
          </span>
        </div>
      ))}
    </div>
  );
}