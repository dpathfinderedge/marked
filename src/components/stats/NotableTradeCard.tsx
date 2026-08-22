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
    <div className="rounded-xl border border-rule bg-surface px-4 py-3">
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        {label}
      </p>
      {trade ? (
        <>
          <p
            className={`font-mono text-2xl font-medium ${
              tone === "positive" ? "text-green" : "text-stamp"
            }`}
          >
            {tone === "positive" ? "+" : "−"}$
            {Math.abs(trade.pnl).toFixed(2)}
          </p>
          <p className="font-mono text-xs text-muted">
            {trade.pair} · {trade.date}
          </p>
        </>
      ) : (
        <p className="font-mono text-lg text-muted">—</p>
      )}
    </div>
  );
}