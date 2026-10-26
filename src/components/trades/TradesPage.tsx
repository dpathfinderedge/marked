import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Upload } from "lucide-react";
import { useTrades } from "@/hooks/useTrades";
import { useSettings } from "@/hooks/useSettings";
import { useAttachments } from "@/hooks/useAttachments";
import { useToast } from "@/hooks/useToast";
import { useSubscription } from "@/hooks/useSubscription";
import { detectConsecutiveLossFlags } from "@/lib/calculations";
import { countTradesThisMonth, FREE_TRADE_LIMIT } from "@/lib/calculations";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { TradeForm } from "@/components/trades/TradeForm";
import { TradeList } from "@/components/trades/TradeList";
import { PageHeader } from "@/components/ui/PageHeader";
import type { NewTradeInput } from "@/utils/tradeMappers";

export function TradesPage(): JSX.Element {
  const { trades, isLoading, error, addTrade } = useTrades();
  const { threshold } = useSettings();
  const { uploadAttachments } = useAttachments();
  const { showToast } = useToast();
  const { isPro } = useSubscription();
  const tradesThisMonth = countTradesThisMonth(trades);
  const isAtFreeLimit = !isPro && tradesThisMonth >= FREE_TRADE_LIMIT;

  const flaggedTradeIds = useMemo(
    () => detectConsecutiveLossFlags(trades, threshold),
    [trades, threshold],
  );

  const handleAddTrade = async (
    input: NewTradeInput,
    files: File[],
  ): Promise<{ error: string | null }> => {
    if (isAtFreeLimit) {
      const message = `You've hit the free plan's ${FREE_TRADE_LIMIT} trades/month limit.`;
      showToast(message, "error");
      return { error: message };
    }

    const { error: addError, trade } = await addTrade(input);

    if (addError || !trade) {
      const message = addError ?? "Something went wrong saving the trade.";
      showToast(message, "error");
      return { error: message };
    }

    if (files.length > 0) {
      const { error: uploadError } = await uploadAttachments(
        trade.id,
        files,
      );
      if (uploadError) {
        const message = `Trade saved, but attachment upload failed: ${uploadError}`;
        showToast(message, "error");
        return { error: message };
      }
    }

    showToast("Trade logged.");
    return { error: null };
  };

  const countLabel = isLoading
    ? undefined
    : `${trades.length} trade${trades.length === 1 ? "" : "s"} logged`;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Trades"
        description={countLabel}
        actions={
          <Link
            to="/trades/import"
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-bg-2 hover:text-text"
          >
            <Upload size={14} />
            Import CSV
          </Link>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-3 lg:sticky lg:top-7">
          {isAtFreeLimit ? (
            <UpgradePrompt feature={`Logging more than ${FREE_TRADE_LIMIT} trades/month`} />
          ) : (
            <TradeForm onSubmit={handleAddTrade} />
          )}
          {error ? <p className="text-xs text-signal-red">{error}</p> : null}
        </div>

        <TradeList
          trades={trades}
          isLoading={isLoading}
          flaggedTradeIds={flaggedTradeIds}
        />
      </div>
    </div>
  );
}