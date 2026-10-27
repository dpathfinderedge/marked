import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
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
import { isValidForexPair, normalizePair, riskReward } from "@/lib/calculations";

interface RiskRewardToolProps {
  market: "forex" | "crypto";
}

export function RiskRewardTool({ market }: RiskRewardToolProps): JSX.Element {
  const [pair, setPair] = useState(market === "forex" ? "EURUSD" : "");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [risk, setRisk] = useState("");

  const pairForPips = market === "forex" && isValidForexPair(pair) ? pair : undefined;

  const result = useMemo(
    () =>
      riskReward({
        entry: parseNumber(entry),
        stop: parseNumber(stop),
        target: parseNumber(target),
        riskAmount: parseNumber(risk),
        pair: pairForPips,
      }),
    [entry, stop, target, risk, pairForPips],
  );

  const hasAnyInput = [entry, stop, target].some((v) => v.trim() !== "");

  let panel: JSX.Element;
  if (!result.ok) {
    panel = <ResultCard primary={null} message={hasAnyInput ? result.error : EMPTY_PROMPT} />;
  } else {
    const r = result.value;
    const showPips = r.riskPips !== null && r.rewardPips !== null;
    const price = (n: number): string =>
      pairForPips ? formatPairPrice(n, normalizePair(pairForPips)) : formatTrimmed(n, 6);
    const total = r.riskDistance + r.rewardDistance;

    const warnings: string[] = [];
    if (r.ratio < 1) {
      warnings.push(
        `You'd risk more than you stand to make. You'd need to win about ${(r.breakEvenWinRate * 100).toFixed(0)}% of trades just to break even.`,
      );
    }

    panel = (
      <ResultCard
        primary={{
          label: "Risk : reward",
          value: `1 : ${formatTrimmed(r.ratio, 2)}`,
          hint: `${r.direction === "long" ? "Long" : "Short"}${
            pairForPips ? ` ${normalizePair(pairForPips)}` : ""
          } · ${formatTrimmed(r.ratio, 2)}R if the target is hit`,
        }}
        rows={[
          {
            label: "Risk",
            value: showPips
              ? `${formatTrimmed(r.riskPips as number, 1)} pips`
              : `${price(r.riskDistance)} (${r.riskPercent.toFixed(2)}%)`,
            tone: "negative",
          },
          {
            label: "Reward",
            value: showPips
              ? `${formatTrimmed(r.rewardPips as number, 1)} pips`
              : `${price(r.rewardDistance)} (${r.rewardPercent.toFixed(2)}%)`,
            tone: "positive",
          },
          {
            label: "Win rate needed to break even",
            value: `${(r.breakEvenWinRate * 100).toFixed(1)}%`,
          },
          ...(r.rewardAmount !== null
            ? [
                {
                  label: "Risking",
                  value: formatMoney(parseNumber(risk)),
                  tone: "negative" as const,
                },
                {
                  label: "Stand to make",
                  value: formatMoney(r.rewardAmount),
                  tone: "positive" as const,
                },
              ]
            : []),
        ]}
        warnings={warnings}
      >
        <div
          className="flex h-3 overflow-hidden rounded-full"
          role="img"
          aria-label={`Risk to reward drawn to scale, 1 to ${formatTrimmed(r.ratio, 2)}`}
        >
          <div className="bg-signal-red" style={{ width: `${(r.riskDistance / total) * 100}%` }} />
          <div className="bg-signal-green" style={{ width: `${(r.rewardDistance / total) * 100}%` }} />
        </div>
        <div className="relative mt-1.5 h-4 text-xs text-text-muted">
          <span className="absolute left-0">Stop</span>
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `clamp(12%, ${(r.riskDistance / total) * 100}%, 88%)` }}
          >
            Entry
          </span>
          <span className="absolute right-0">Target</span>
        </div>
      </ResultCard>
    );
  }

  return (
    <ToolLayout
      inputs={
        <>
          {market === "forex" ? (
            <Input
              label="Pair (optional, for pips)"
              placeholder="EURUSD"
              autoCapitalize="characters"
              autoComplete="off"
              value={pair}
              onChange={(e) => setPair(e.target.value.toUpperCase())}
            />
          ) : null}
          <div className="grid grid-cols-3 gap-4">
            <NumberField label="Entry" value={entry} onChange={setEntry} />
            <NumberField label="Stop-loss" value={stop} onChange={setStop} />
            <NumberField label="Target" value={target} onChange={setTarget} />
          </div>
          <NumberField
            label="Amount you're risking ($, optional)"
            placeholder="100"
            value={risk}
            onChange={setRisk}
            hint="Add it to see how much you'd make at the target."
          />
        </>
      }
      result={panel}
    />
  );
}