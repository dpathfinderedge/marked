import { useContext } from "react";
import {
  SubscriptionContext,
  type SubscriptionContextValue,
} from "@/context/subscription-context";

export type { SubscriptionStatus } from "@/context/subscription-context";

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);

  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within a <SubscriptionProvider>.",
    );
  }

  return context;
}