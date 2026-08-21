import { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useSettings } from "@/hooks/useSettings";
import { detectConsecutiveLossFlags } from "@/lib/calculations";
import { TradeForm } from "@/components/trades/TradeForm";
import { TradeList } from "@/components/trades/TradeList";

export function TradesPage(): JSX.Element {
  const { trades, isLoading, error, addTrade } = useTrades();
  const { threshold } = useSettings();

  const flaggedTradeIds = useMemo(
    () => detectConsecutiveLossFlags(trades, threshold),
    [trades, threshold],
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl italic text-ink">Trades</h1>

      <TradeForm onSubmit={addTrade} />

      {error ? <p className="font-mono text-xs text-stamp">{error}</p> : null}

      <TradeList
        trades={trades}
        isLoading={isLoading}
        flaggedTradeIds={flaggedTradeIds}
      />
    </div>
  );
}