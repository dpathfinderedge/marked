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
    <div className="rounded-xl border border-line bg-bg-1 px-4 py-3">
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {label}
      </p>
      {trade ? (
        <>
          <p
            className={`font-mono text-2xl font-medium ${
              tone === "positive" ? "text-signal-green" : "text-signal-red"
            }`}
          >
            {tone === "positive" ? "+" : "−"}$
            {Math.abs(trade.pnl).toFixed(2)}
          </p>
          <p className="font-mono text-xs text-text-muted">
            {trade.pair} · {trade.date}
          </p>
        </>
      ) : (
        <p className="font-mono text-lg text-text-muted">—</p>
      )}
    </div>
  );
}