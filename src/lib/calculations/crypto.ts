import type { Direction } from "@/types/trade";

export interface CryptoCalcInput {
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
}

export function calculateCryptoPnl(input: CryptoCalcInput): number {
  const priceDiff =
    (input.exitPrice - input.entryPrice) * (input.direction === "long" ? 1 : -1);
  return priceDiff * input.quantity;
}