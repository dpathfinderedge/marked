import type { Trade } from "@/types/trade";

export const FREE_TRADE_LIMIT = 50;

export function countTradesThisMonth(
  trades: Trade[],
  now: Date = new Date(),
): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  return trades.filter((t) => {
    const created = new Date(t.createdAt);
    return created.getFullYear() === year && created.getMonth() === month;
  }).length;
}