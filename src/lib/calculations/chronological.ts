import type { Trade } from "@/types/trade";

export function chronological(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => a.date.localeCompare(b.date));
}