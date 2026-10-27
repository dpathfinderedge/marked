import { useMemo, useState } from "react";
import {
  NumberField,
  ResultCard,
  ToolLayout,
} from "@/components/calculator/parts";
import {
  EMPTY_PROMPT,
  formatMoney,
  formatPairPrice,
  formatTrimmed,
  parseNumber,
} from "@/components/calculator/helpers";
import { ForexInstrumentFields } from "@/components/calculator/ForexFields";
import { useStoredState } from "@/hooks/useStoredState";
import {
  forexPositionSize,
  isMetalPair,
  normalizePair,
  riskFromPercent,
} from "@/lib/calculations";
import type { ContractSize } from "@/types/trade";

export function ForexPositionTool(): JSX.Element {
  const [balance, setBalance] = useStoredState("marked-calc-balance", "");
  const [riskPercent, setRiskPercent] = useStoredState("marked-calc-risk-percent", "1");
  const [pair, setPair] = useState("EURUSD");
  const [contractSize, setContractSize] = useState<ContractSize>("standard");
  const [customUnits, setCustomUnits] = useState("");
  const [quoteRate, setQuoteRate] = useState("");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");

  const riskAmount = riskFromPercent(parseNumber(balance), parseNumber(riskPercent));
  const normalizedPair = normalizePair(pair);
  const isMetal = isMetalPair(pair);

  const result = useMemo(
    () =>
      forexPositionSize({
        pair,
        contractSize,
        customContractUnits: parseNumber(customUnits),
        quoteToUsdRate: parseNumber(quoteRate),
        entry: parseNumber(entry),
        stop: parseNumber(stop),
        riskAmount,
      }),
    [pair, contractSize, customUnits, quoteRate, entry, stop, riskAmount],
  );

  const hasAnyInput = [balance, entry, stop].some((v) => v.trim() !== "");

  let panel: JSX.Element;
  if (!result.ok) {
    panel = (
      <ResultCard primary={null} message={hasAnyInput ? result.error : EMPTY_PROMPT} />
    );
  } else {
    const r = result.value;
    const priceOf = (n: number): string =>
      isMetal ? formatTrimmed(n, 2) : formatPairPrice(n, normalizedPair);
    const warnings: string[] = [];
    if (r.lots === 0) {
      warnings.push(
        `Even the smallest size (0.01 lots) would risk more than ${formatMoney(riskAmount)} here. Widen your risk or tighten the stop.`,
      );
    }

    panel = (
      <ResultCard
        primary={{
          label: "Position size",
          value: `${r.lots.toFixed(2)} lots`,
          hint: `${r.direction === "long" ? "Long" : "Short"} ${normalizedPair} · ${formatTrimmed(r.units, 0)} units`,
        }}
        rows={[
          { label: "Risk if stopped out", value: formatMoney(r.riskAtLots), tone: "negative" },
          { label: "Target risk", value: formatMoney(riskAmount) },
          {
            label: "Stop distance",
            value: isMetal
              ? `${formatTrimmed(r.stopDistance, 2)} in price`
              : `${formatTrimmed(r.stopPips, 1)} pips`,
          },
          {
            label: isMetal ? "Value per $1 move, 1 lot" : "Pip value, 1 lot",
            value: isMetal
              ? formatMoney(r.pipValuePerLot / 0.0001)
              : formatMoney(r.pipValuePerLot),
          },
          { label: "Exact size", value: `${r.lotsExact.toFixed(4)} lots` },
          { label: "Entry", value: priceOf(parseNumber(entry)) },
          { label: "Stop-loss", value: priceOf(parseNumber(stop)) },
        ]}
        warnings={warnings}
        notes={[
          "Rounded down to 0.01 lots, so your risk never goes over the target.",
          "Spreads, commissions and slippage aren't included.",
        ]}
      />
    );
  }

  return (
    <ToolLayout
      inputs={
        <>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Account balance ($)"
              placeholder="10000"
              value={balance}
              onChange={setBalance}
            />
            <NumberField
              label="Risk per trade (%)"
              placeholder="1"
              value={riskPercent}
              onChange={setRiskPercent}
              hint={riskAmount > 0 ? `${formatMoney(riskAmount)} at risk` : undefined}
            />
          </div>

          <ForexInstrumentFields
            pair={pair}
            onPairChange={setPair}
            contractSize={contractSize}
            onContractSizeChange={setContractSize}
            customUnits={customUnits}
            onCustomUnitsChange={setCustomUnits}
            quoteRate={quoteRate}
            onQuoteRateChange={setQuoteRate}
          />

          <div className="grid grid-cols-2 gap-4">
            <NumberField label="Entry price" value={entry} onChange={setEntry} />
            <NumberField
              label="Stop-loss price"
              value={stop}
              onChange={setStop}
              hint="Below entry for a long, above for a short."
            />
          </div>
        </>
      }
      result={panel}
    />
  );
}