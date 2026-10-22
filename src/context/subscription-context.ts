import { createContext } from "react";

export type SubscriptionStatus = "free" | "active" | "past_due" | "cancelled";

export interface SubscriptionContextValue {
  status: SubscriptionStatus;
  isPro: boolean;
  cancelAtPeriodEnd: boolean;
  planCode: string | null;
  currentPeriodEnd: string | null;
  isLoading: boolean;
  refetch: () => Promise<SubscriptionStatus>;
}

export const SubscriptionContext = createContext<
  SubscriptionContextValue | undefined
>(undefined);