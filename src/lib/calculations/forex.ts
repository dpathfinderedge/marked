import type { ContractSize, Direction } from "@/types/trade";

export interface ForexCalcInput {
  pair: string;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  lots: number;
  contractSize: ContractSize;
  customContractUnits?: number;
}

export interface ForexCalcResult {
  pnl: number;
  pips: number;
  calcMode: "direct" | "converted";
}

const CONTRACT_UNITS: Record<Exclude<ContractSize, "custom">, number> = {
  standard: 100_000,
  mini: 10_000,
  micro: 1_000,
};

export class ForexCrossPairError extends Error {
  constructor(pair: string) {
    super(
      `${pair} is a cross pair with no USD leg — P&L can't be auto-priced. ` +
        "Enter it manually.",
    );
    this.name = "ForexCrossPairError";
  }
}

function resolveUnits(input: ForexCalcInput): number {
  if (input.contractSize === "custom") {
    if (!input.customContractUnits || input.customContractUnits <= 0) {
      throw new Error(
        "customContractUnits must be a positive number when contractSize is 'custom'.",
      );
    }
    return input.customContractUnits * input.lots;
  }
  return CONTRACT_UNITS[input.contractSize] * input.lots;
}

export function calculateForexPnl(input: ForexCalcInput): ForexCalcResult {
  const pair = input.pair.toUpperCase();
  const pipSize = pair.endsWith("JPY") ? 0.01 : 0.0001;

  const priceDiff =
    (input.exitPrice - input.entryPrice) * (input.direction === "long" ? 1 : -1);
  const pips = priceDiff / pipSize;
  const units = resolveUnits(input);

  if (pair.endsWith("USD")) {
    return { pnl: priceDiff * units, pips, calcMode: "direct" };
  }

  if (pair.startsWith("USD")) {
    return { pnl: (priceDiff * units) / input.exitPrice, pips, calcMode: "converted" };
  }

  throw new ForexCrossPairError(input.pair);
}