import { useState } from "react";
import { Camera } from "lucide-react";
import { Stamp } from "@/components/ui/Stamp";
import { TradeAttachments } from "@/components/trades/TradeAttachments";
import type { Trade } from "@/types/trade";

interface TradeListProps {
  trades: Trade[];
  isLoading: boolean;
  flaggedTradeIds?: Set<string>;
}

function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "−";
  return `${sign}${Math.abs(pnl).toFixed(2)}`;
}

export function TradeList({
  trades,
  isLoading,
  flaggedTradeIds,
}: TradeListProps): JSX.Element {
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

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
      {trades.map((trade) => {
        const isFlagged = flaggedTradeIds?.has(trade.id) ?? false;
        const isExpanded = expandedTradeId === trade.id;

        return (
          <div key={trade.id} className="border-b border-rule last:border-b-0">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 font-mono text-sm font-medium text-ink">
                  {trade.pair}
                  {isFlagged ? (
                    <span title="Flagged: follows a losing streak">
                      <Stamp size={14} className="text-stamp" />
                    </span>
                  ) : null}
                </span>
                <span className="font-mono text-xs text-muted">
                  {trade.date} · {trade.session}
                  {trade.tag ? ` · ${trade.tag}` : ""}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`font-mono text-sm font-medium ${
                    trade.pnl >= 0 ? "text-green" : "text-stamp"
                  }`}
                >
                  {formatPnl(trade.pnl)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedTradeId(isExpanded ? null : trade.id)
                  }
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    isExpanded
                      ? "bg-stamp/10 text-stamp"
                      : "text-muted hover:text-ink"
                  }`}
                  title="Screenshots"
                >
                  <Camera size={14} />
                </button>
              </div>
            </div>

            {isExpanded ? (
              <div className="border-t border-rule bg-paper">
                <TradeAttachments tradeId={trade.id} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}