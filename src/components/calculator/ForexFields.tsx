import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  NumberField,
  QuoteRateField,
} from "@/components/calculator/parts";
import { isCrossPair, isMetalPair, normalizePair } from "@/lib/calculations";
import type { ContractSize } from "@/types/trade";

export const FOREX_PAIRS_LIST_ID = "calculator-forex-pairs";

const COMMON_PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "NZDUSD",
  "USDCAD",
  "USDCHF",
  "EURGBP",
  "EURJPY",
  "GBPJPY",
  "XAUUSD",
];

const CONTRACT_OPTIONS = [
  { value: "standard", label: "Standard (100,000)" },
  { value: "mini", label: "Mini (10,000)" },
  { value: "micro", label: "Micro (1,000)" },
  { value: "custom", label: "Custom" },
];

interface PairFieldProps {
  pair: string;
  onPairChange: (value: string) => void;
  contractSize: ContractSize;
  onContractSizeChange: (value: ContractSize) => void;
  customUnits: string;
  onCustomUnitsChange: (value: string) => void;
  price?: string;
  onPriceChange?: (value: string) => void;
  quoteRate: string;
  onQuoteRateChange: (value: string) => void;
}

export function ForexInstrumentFields({
  pair,
  onPairChange,
  contractSize,
  onContractSizeChange,
  customUnits,
  onCustomUnitsChange,
  price,
  onPriceChange,
  quoteRate,
  onQuoteRateChange,
}: PairFieldProps): JSX.Element {
  const normalized = normalizePair(pair);
  const needsPrice = onPriceChange !== undefined && normalized.length === 6 && normalized.startsWith("USD");

  return (
    <>
      <datalist id={FOREX_PAIRS_LIST_ID}>
        {COMMON_PAIRS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Pair"
          placeholder="EURUSD"
          list={FOREX_PAIRS_LIST_ID}
          autoCapitalize="characters"
          autoComplete="off"
          value={pair}
          onChange={(e) => onPairChange(e.target.value.toUpperCase())}
        />
        <Select
          label="Contract size"
          options={CONTRACT_OPTIONS}
          value={contractSize}
          onChange={(e) => onContractSizeChange(e.target.value as ContractSize)}
        />
      </div>

      {contractSize === "custom" ? (
        <NumberField
          label="Units per lot"
          placeholder={isMetalPair(pair) ? "100" : "100000"}
          value={customUnits}
          onChange={onCustomUnitsChange}
          hint={
            isMetalPair(pair)
              ? "Gold is usually 100 oz per lot. Check your broker."
              : undefined
          }
        />
      ) : isMetalPair(pair) ? (
        <p className="text-xs text-text-faint">
          Metals don't use currency lot sizes. Choose Custom and enter the units per lot
          (gold is usually 100 oz).
        </p>
      ) : null}

      {needsPrice ? (
        <NumberField
          label={`Current ${normalized} price`}
          placeholder="150.00"
          value={price ?? ""}
          onChange={onPriceChange}
          hint="Pairs that start with USD need the price to value a pip in dollars."
        />
      ) : null}

      {isCrossPair(pair) ? (
        <QuoteRateField pair={normalized} value={quoteRate} onChange={onQuoteRateChange} />
      ) : null}
    </>
  );
}