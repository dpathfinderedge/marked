import { useMemo, useState } from "react";
import {
  NumberField,
  ResultCard,
  ToolLayout,
} from "@/components/calculator/parts";
import {
  EMPTY_PROMPT,
  formatMoney,
  formatTrimmed,
  parseNumber,
} from "@/components/calculator/helpers";
import { useStoredState } from "@/hooks/useStoredState";
import { cryptoPositionSize, riskFromPercent } from "@/lib/calculations";

export function CryptoPositionTool(): JSX.Element {
  const [balance, setBalance] = useStoredState("marked-calc-balance", "");
  const [riskPercent, setRiskPercent] = useStoredState("marked-calc-risk-percent", "1");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [leverage, setLeverage] = useState("1");
  const [maintenance, setMaintenance] = useState("0.5");

  const riskAmount = riskFromPercent(parseNumber(balance), parseNumber(riskPercent));

  const result = useMemo(
    () =>
      cryptoPositionSize({
        balance: parseNumber(balance),
        entry: parseNumber(entry),
        stop: parseNumber(stop),
        riskAmount,
        leverage: parseNumber(leverage),
        maintenanceMarginPercent: parseNumber(maintenance),
      }),
    [balance, entry, stop, riskAmount, leverage, maintenance],
  );

  const hasAnyInput = [balance, entry, stop].some((v) => v.trim() !== "");

  let panel: JSX.Element;
  if (!result.ok) {
    panel = <ResultCard primary={null} message={hasAnyInput ? result.error : EMPTY_PROMPT} />;
  } else {
    const r = result.value;
    const warnings: string[] = [];
    if (r.liquidatesBeforeStop && r.liquidationPrice !== null) {
      warnings.push(
        `At ${formatTrimmed(parseNumber(leverage), 2)}x you'd be liquidated at about ${formatTrimmed(r.liquidationPrice, 2)}, before your stop at ${formatTrimmed(parseNumber(stop), 2)}. Lower the leverage or move the stop closer.`,
      );
    }
    if (r.marginExceedsBalance) {
      warnings.push(
        `This position needs ${formatMoney(r.margin)} of margin, more than your ${formatMoney(parseNumber(balance))} balance. Use more leverage, a tighter stop or less risk.`,
      );
    }

    panel = (
      <ResultCard
        primary={{
          label: "Position size (coins)",
          value: formatTrimmed(r.quantity, 6),
          hint: `${r.direction === "long" ? "Long" : "Short"} · worth ${formatMoney(r.notional)}`,
        }}
        rows={[
          { label: "Risk if stopped out", value: formatMoney(riskAmount), tone: "negative" },
          { label: "Position value", value: formatMoney(r.notional) },
          {
            label: "Margin needed",
            value: formatMoney(r.margin),
            tone: r.marginExceedsBalance ? "negative" : undefined,
          },
          {
            label: "Stop distance",
            value: `${formatTrimmed(r.stopDistance, 4)} (${r.stopPercent.toFixed(2)}%)`,
          },
          {
            label: "Liquidation price",
            value: r.liquidationPrice === null ? "None (spot)" : formatTrimmed(r.liquidationPrice, 2),
            tone: r.liquidatesBeforeStop ? "negative" : undefined,
          },
        ]}
        warnings={warnings}
        notes={[
          "Liquidation is an estimate for isolated margin. Exchanges differ, so check yours before relying on it.",
          "Fees and funding aren't included.",
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
          <div className="grid grid-cols-2 gap-4">
            <NumberField label="Entry price" placeholder="50000" value={entry} onChange={setEntry} />
            <NumberField
              label="Stop-loss price"
              placeholder="49000"
              value={stop}
              onChange={setStop}
              hint="Below entry for a long, above for a short."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Leverage (x)"
              placeholder="1"
              value={leverage}
              onChange={setLeverage}
              hint="Use 1 for spot."
            />
            <NumberField
              label="Maintenance margin (%)"
              placeholder="0.5"
              value={maintenance}
              onChange={setMaintenance}
              hint="Check your exchange's rate."
            />
          </div>
        </>
      }
      result={panel}
    />
  );
}