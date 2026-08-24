import type { ContractSize, Direction } from "@/types/trade";
import { resolveContractUnits } from "@/lib/calculations/forex";

export interface CrossPairCalcInput {
  pair: string;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  lots: number;
  contractSize: ContractSize;
  customContractUnits?: number;
  quoteToUsdRate: number;
}

export interface CrossPairCalcResult {
  pnl: number;
  pips: number;
}

export function calculateCrossPairPnl(
  input: CrossPairCalcInput,
): CrossPairCalcResult {
  const pair = input.pair.toUpperCase();
  const pipSize = pair.endsWith("JPY") ? 0.01 : 0.0001;

  const priceDiff =
    (input.exitPrice - input.entryPrice) * (input.direction === "long" ? 1 : -1);
  const pips = priceDiff / pipSize;
  const units = resolveContractUnits(input);

  const pnl = priceDiff * units * input.quoteToUsdRate;
  return { pnl, pips };
}