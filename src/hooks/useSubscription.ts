import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type SubscriptionStatus = "free" | "active" | "past_due" | "cancelled";

interface UseSubscriptionResult {
  status: SubscriptionStatus;
  isPro: boolean;
  currentPeriodEnd: string | null;
  isLoading: boolean;
}

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>("free");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStatus("free");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      setStatus((data?.status as SubscriptionStatus) ?? "free");
      setCurrentPeriodEnd(data?.current_period_end ?? null);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    status,
    isPro: status === "active",
    currentPeriodEnd,
    isLoading,
  };
}