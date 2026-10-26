import type { NotableTrade } from "@/lib/calculations";

interface NotableTradeCardProps {
  label: string;
  trade: NotableTrade | null;
  tone: "positive" | "negative";
}

export function NotableTradeCard({
  label,
  trade,
  tone,
}: NotableTradeCardProps): JSX.Element {
  return (
    <div className="rounded-lg bg-bg-2/60 px-3.5 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      {trade ? (
        <>
          <p
            className={`mt-1 font-mono text-xl font-medium ${
              tone === "positive" ? "text-signal-green" : "text-signal-red"
            }`}
          >
            {tone === "positive" ? "+" : "−"}$
            {Math.abs(trade.pnl).toFixed(2)}
          </p>
          <p className="mt-1 truncate font-mono text-xs text-text">{trade.pair}</p>
          <p className="font-mono text-xs text-text-muted">{trade.date}</p>
        </>
      ) : (
        <p className="font-mono text-lg text-text-muted">—</p>
      )}
    </div>
  );
}