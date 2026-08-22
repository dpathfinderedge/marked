import type { Trade } from "@/types/trade";
import { chronological } from "@/lib/calculations/chronological";

export function detectConsecutiveLossFlags(
  trades: Trade[],
  threshold: number,
): Set<string> {
  const flagged = new Set<string>();
  if (threshold <= 0) return flagged;

  let streak = 0;
  for (const trade of chronological(trades)) {
    if (streak >= threshold) {
      flagged.add(trade.id);
    }
    streak = trade.pnl < 0 ? streak + 1 : 0;
  }

  return flagged;
}