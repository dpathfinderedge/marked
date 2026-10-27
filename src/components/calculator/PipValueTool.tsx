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
import { ForexInstrumentFields } from "@/components/calculator/ForexFields";
import { getPipSize, normalizePair, pipValuePerLot } from "@/lib/calculations";
import type { ContractSize } from "@/types/trade";

export function PipValueTool(): JSX.Element {
  const [pair, setPair] = useState("EURUSD");
  const [contractSize, setContractSize] = useState<ContractSize>("standard");
  const [customUnits, setCustomUnits] = useState("");
  const [price, setPrice] = useState("");
  const [quoteRate, setQuoteRate] = useState("");
  const [lots, setLots] = useState("1");

  const normalizedPair = normalizePair(pair);
  const lotsNumber = parseNumber(lots);

  const shared = useMemo(
    () => ({
      pair,
      customContractUnits: parseNumber(customUnits),
      price: parseNumber(price),
      quoteToUsdRate: parseNumber(quoteRate),
    }),
    [pair, customUnits, price, quoteRate],
  );

  const result = useMemo(
    () => pipValuePerLot({ ...shared, contractSize }),
    [shared, contractSize],
  );

  const bySize = useMemo(
    () =>
      (["standard", "mini", "micro"] as const).map((size) => ({
        size,
        value: pipValuePerLot({ ...shared, contractSize: size }),
      })),
    [shared],
  );

  let panel: JSX.Element;
  if (!result.ok) {
    panel = (
      <ResultCard
        primary={null}
        message={pair.trim() === "" ? EMPTY_PROMPT : result.error}
      />
    );
  } else if (!(lotsNumber > 0)) {
    panel = <ResultCard primary={null} message="Enter how many lots you're trading." />;
  } else {
    const perPip = result.value * lotsNumber;
    const labels = { standard: "Standard lot", mini: "Mini lot", micro: "Micro lot" } as const;

    panel = (
      <ResultCard
        primary={{
          label: `Value of one pip, ${formatTrimmed(lotsNumber, 2)} lot${lotsNumber === 1 ? "" : "s"}`,
          value: formatMoney(perPip),
          hint: `${normalizedPair} · 1 pip = ${getPipSize(normalizedPair)}`,
        }}
        rows={[
          { label: "Per 10 pips", value: formatMoney(perPip * 10) },
          { label: "Per 50 pips", value: formatMoney(perPip * 50) },
          { label: "Per 100 pips", value: formatMoney(perPip * 100) },
          ...bySize.map(({ size, value }) => ({
            label: `One pip, 1 ${labels[size].toLowerCase()}`,
            value: value.ok ? formatMoney(value.value) : "—",
          })),
        ]}
        notes={["Values are in US dollars."]}
      />
    );
  }

  return (
    <ToolLayout
      inputs={
        <>
          <ForexInstrumentFields
            pair={pair}
            onPairChange={setPair}
            contractSize={contractSize}
            onContractSizeChange={setContractSize}
            customUnits={customUnits}
            onCustomUnitsChange={setCustomUnits}
            price={price}
            onPriceChange={setPrice}
            quoteRate={quoteRate}
            onQuoteRateChange={setQuoteRate}
          />
          <NumberField label="Lots" placeholder="1" value={lots} onChange={setLots} />
        </>
      }
      result={panel}
    />
  );
}