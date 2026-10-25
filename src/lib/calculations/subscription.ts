import type { Trade } from "@/types/trade";
import type { Database } from "@/types/database";

export const FREE_TRADE_LIMIT = 50;

type SubscriptionStatus =
  Database["public"]["Tables"]["subscriptions"]["Row"]["status"];
  
export const PERIOD_GRACE_MS = 24 * 60 * 60 * 1000;

export interface ProAccessInput {
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

function isWithinPaidPeriod(
  currentPeriodEnd: string | null,
  now: Date,
  whenUnknown: boolean,
): boolean {
  if (!currentPeriodEnd) return whenUnknown;
  const end = Date.parse(currentPeriodEnd);
  if (Number.isNaN(end)) return whenUnknown;
  return now.getTime() < end + PERIOD_GRACE_MS;
}

export function hasProAccess(
  input: ProAccessInput,
  now: Date = new Date(),
): boolean {
  switch (input.status) {
    case "active":
      return input.cancelAtPeriodEnd
        ? isWithinPaidPeriod(input.currentPeriodEnd, now, true)
        : true;
    case "cancelled":
      return isWithinPaidPeriod(input.currentPeriodEnd, now, false);
    default:
      return false;
  }
}

export function countTradesThisMonth(
  trades: Trade[],
  now: Date = new Date(),
): number {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return trades.filter((t) => {
    const created = new Date(t.createdAt);
    return created.getUTCFullYear() === year && created.getUTCMonth() === month;
  }).length;
}