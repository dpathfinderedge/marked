import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Upload } from "lucide-react";
import { useTrades } from "@/hooks/useTrades";
import { useSettings } from "@/hooks/useSettings";
import { useAttachments } from "@/hooks/useAttachments";
import { useToast } from "@/hooks/useToast";
import { detectConsecutiveLossFlags } from "@/lib/calculations";
import { TradeForm } from "@/components/trades/TradeForm";
import { TradeList } from "@/components/trades/TradeList";
import type { NewTradeInput } from "@/utils/tradeMappers";

function SectionLabel({ children }: { children: string }): JSX.Element {
  return (
    <p className="text-xs font-medium uppercase tracking-widest text-text-faint">
      {children}
    </p>
  );
}

export function TradesPage(): JSX.Element {
  const { trades, isLoading, error, addTrade } = useTrades();
  const { threshold } = useSettings();
  const { uploadAttachments } = useAttachments();
  const { showToast } = useToast();

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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text">Trades</h1>
        <Link
          to="/trades/import"
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-bg-2 hover:text-text"
        >
          <Upload size={14} />
          Import CSV
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>New trade</SectionLabel>
        <TradeForm onSubmit={handleAddTrade} />
        {error ? <p className="text-xs text-signal-red">{error}</p> : null}
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>
          {isLoading
            ? "Trades"
            : `${trades.length} trade${trades.length === 1 ? "" : "s"}`}
        </SectionLabel>
        <TradeList
          trades={trades}
          isLoading={isLoading}
          flaggedTradeIds={flaggedTradeIds}
        />
      </div>
    </div>
  );
}