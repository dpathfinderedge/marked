import type { Trade } from "@/types/trade";

function chronological(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => a.date.localeCompare(b.date));
}

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