import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTrades } from "@/hooks/useTrades";
import { useSettings } from "@/hooks/useSettings";
import { useAttachments } from "@/hooks/useAttachments";
import { detectConsecutiveLossFlags } from "@/lib/calculations";
import { TradeForm } from "@/components/trades/TradeForm";
import { TradeList } from "@/components/trades/TradeList";
import type { NewTradeInput } from "@/utils/tradeMappers";

export function TradesPage(): JSX.Element {
  const { trades, isLoading, error, addTrade } = useTrades();
  const { threshold } = useSettings();
  const { uploadAttachments } = useAttachments();

  const flaggedTradeIds = useMemo(
    () => detectConsecutiveLossFlags(trades, threshold),
    [trades, threshold],
  );

  const handleAddTrade = async (
    input: NewTradeInput,
    files: File[],
  ): Promise<{ error: string | null }> => {
    const { error: addError, trade } = await addTrade(input);

    if (addError || !trade) {
      return { error: addError ?? "Something went wrong saving the trade." };
    }

    if (files.length > 0) {
      const { error: uploadError } = await uploadAttachments(
        trade.id,
        files,
      );
      if (uploadError) {
        return {
          error: `Trade saved, but attachment upload failed: ${uploadError}`,
        };
      }
    }

    return { error: null };
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text">Trades</h1>
        <Link
          to="/trades/import"
          className="font-mono text-xs uppercase tracking-wider text-muted underline underline-offset-4"
        >
          Import CSV
        </Link>
      </div>

      <TradeForm onSubmit={handleAddTrade} />

      {error ? <p className="font-mono text-xs text-stamp">{error}</p> : null}

      <TradeList
        trades={trades}
        isLoading={isLoading}
        flaggedTradeIds={flaggedTradeIds}
      />
    </div>
  );
}