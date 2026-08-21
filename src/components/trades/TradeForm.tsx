import { useMemo, useState, type FormEvent } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  calculateForexPnl,
  calculateCryptoPnl,
  calculateRMultiple,
  ForexCrossPairError,
} from "@/lib/calculations";
import type { NewTradeInput } from "@/utils/tradeMappers";
import type {
  ContractSize,
  Direction,
  Market,
  Session,
} from "@/types/trade";

interface TradeFormProps {
  onSubmit: (input: NewTradeInput) => Promise<{ error: string | null }>;
}

const MARKET_OPTIONS = [
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
];

const DIRECTION_OPTIONS = [
  { value: "long", label: "Long" },
  { value: "short", label: "Short" },
];

const SESSION_OPTIONS = [
  { value: "Asian", label: "Asian" },
  { value: "London", label: "London" },
  { value: "New York", label: "New York" },
  { value: "Overlap", label: "Overlap" },
];

const CONTRACT_SIZE_OPTIONS = [
  { value: "standard", label: "Standard (100,000)" },
  { value: "mini", label: "Mini (10,000)" },
  { value: "micro", label: "Micro (1,000)" },
  { value: "custom", label: "Custom" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TradeForm({ onSubmit }: TradeFormProps): JSX.Element {
  const isOnline = useOnlineStatus();
  const [date, setDate] = useState(todayIso());
  const [market, setMarket] = useState<Market>("forex");
  const [pair, setPair] = useState("");
  const [direction, setDirection] = useState<Direction>("long");
  const [session, setSession] = useState<Session>("London");
  const [tag, setTag] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [lots, setLots] = useState("");
  const [contractSize, setContractSize] = useState<ContractSize>("standard");
  const [customUnits, setCustomUnits] = useState("");
  const [quantity, setQuantity] = useState("");
  const [risk, setRisk] = useState("");
  const [manualPnl, setManualPnl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preview = useMemo(():
    | { pnl: number; pips: number | null; calcMode: "direct" | "converted" }
    | { crossPairError: string }
    | null => {
    const entry = Number(entryPrice);
    const exit = Number(exitPrice);
    if (!entryPrice || !exitPrice || Number.isNaN(entry) || Number.isNaN(exit)) {
      return null;
    }

    if (market === "crypto") {
      const qty = Number(quantity);
      if (!quantity || Number.isNaN(qty)) return null;
      const pnl = calculateCryptoPnl({
        direction,
        entryPrice: entry,
        exitPrice: exit,
        quantity: qty,
      });
      return { pnl, pips: null, calcMode: "direct" };
    }

    const lotsNum = Number(lots);
    if (!pair || !lots || Number.isNaN(lotsNum)) return null;

    try {
      const result = calculateForexPnl({
        pair,
        direction,
        entryPrice: entry,
        exitPrice: exit,
        lots: lotsNum,
        contractSize,
        customContractUnits: customUnits ? Number(customUnits) : undefined,
      });
      return result;
    } catch (err) {
      if (err instanceof ForexCrossPairError) {
        return { crossPairError: err.message };
      }
      return null;
    }
  }, [market, entryPrice, exitPrice, quantity, pair, lots, direction, contractSize, customUnits]);

  const needsManualEntry = preview !== null && "crossPairError" in preview;
  const computedPnl = preview !== null && "pnl" in preview ? preview.pnl : null;
  const finalPnl = needsManualEntry ? Number(manualPnl) : computedPnl;

  const resetForm = (): void => {
    setPair("");
    setEntryPrice("");
    setExitPrice("");
    setLots("");
    setCustomUnits("");
    setQuantity("");
    setRisk("");
    setManualPnl("");
    setTag("");
    setNotes("");
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (!isOnline) {
      setError("You're offline — connect to log a trade.");
      return;
    }

    if (finalPnl === null || Number.isNaN(finalPnl)) {
      setError(
        needsManualEntry
          ? "Enter a manual P&L for this cross pair."
          : "Fill in entry/exit price (and lots or quantity) first.",
      );
      return;
    }

    const riskValue = risk ? Number(risk) : null;
    const pips = preview !== null && "pips" in preview ? preview.pips : null;
    const calcMode = needsManualEntry
      ? "manual"
      : preview !== null && "calcMode" in preview
        ? preview.calcMode
        : "manual";

    setIsSubmitting(true);
    const { error: submitError } = await onSubmit({
      date,
      market,
      pair: market === "crypto" ? pair : pair.toUpperCase(),
      direction,
      session,
      tag,
      risk: riskValue,
      pnl: finalPnl,
      pips,
      rMultiple: calculateRMultiple(finalPnl, riskValue),
      notes,
      calcMode,
    });
    setIsSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    resetForm();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-rule bg-surface p-6"
    >
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Select
          label="Market"
          options={MARKET_OPTIONS}
          value={market}
          onChange={(e) => setMarket(e.target.value as Market)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Pair"
          placeholder={market === "forex" ? "EURUSD" : "BTCUSDT"}
          required
          value={pair}
          onChange={(e) => setPair(e.target.value)}
        />
        <Select
          label="Direction"
          options={DIRECTION_OPTIONS}
          value={direction}
          onChange={(e) => setDirection(e.target.value as Direction)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Entry price"
          type="number"
          step="any"
          required
          value={entryPrice}
          onChange={(e) => setEntryPrice(e.target.value)}
        />
        <Input
          label="Exit price"
          type="number"
          step="any"
          required
          value={exitPrice}
          onChange={(e) => setExitPrice(e.target.value)}
        />
      </div>

      {market === "forex" ? (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Lots"
            type="number"
            step="any"
            required
            value={lots}
            onChange={(e) => setLots(e.target.value)}
          />
          <Select
            label="Contract size"
            options={CONTRACT_SIZE_OPTIONS}
            value={contractSize}
            onChange={(e) => setContractSize(e.target.value as ContractSize)}
          />
        </div>
      ) : (
        <Input
          label="Quantity"
          type="number"
          step="any"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      )}

      {market === "forex" && contractSize === "custom" ? (
        <Input
          label="Custom units per lot"
          type="number"
          step="any"
          required
          value={customUnits}
          onChange={(e) => setCustomUnits(e.target.value)}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Session"
          options={SESSION_OPTIONS}
          value={session}
          onChange={(e) => setSession(e.target.value as Session)}
        />
        <Input
          label="Tag / setup"
          placeholder="breakout, reversal…"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
      </div>

      <Input
        label="Risk ($, optional)"
        type="number"
        step="any"
        value={risk}
        onChange={(e) => setRisk(e.target.value)}
      />

      <div className="rounded-lg border border-rule bg-paper px-4 py-3">
        {needsManualEntry ? (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs text-stamp">
              {(preview as { crossPairError: string }).crossPairError}
            </p>
            <Input
              label="Manual P&L ($)"
              type="number"
              step="any"
              required
              value={manualPnl}
              onChange={(e) => setManualPnl(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between font-mono text-sm">
            <span className="text-muted">P&L preview</span>
            <span className={computedPnl !== null && computedPnl < 0 ? "text-stamp" : "text-green"}>
              {computedPnl !== null ? computedPnl.toFixed(2) : "—"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="notes"
          className="font-mono text-xs uppercase tracking-wider text-muted"
        >
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          className="rounded-lg border border-rule bg-paper px-3 py-2 font-sans text-sm text-ink outline-none transition-colors focus:border-stamp"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error ? <p className="font-mono text-xs text-stamp">{error}</p> : null}

      <Button type="submit" isLoading={isSubmitting} disabled={!isOnline}>
        {isOnline ? "Log trade" : "Offline"}
      </Button>
    </form>
  );
}