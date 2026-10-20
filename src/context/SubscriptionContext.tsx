import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  SubscriptionContext,
  type SubscriptionContextValue,
  type SubscriptionStatus,
} from "@/context/subscription-context";

export function SubscriptionProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [status, setStatus] = useState<SubscriptionStatus>("free");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const statusRef = useRef<SubscriptionStatus>("free");
  const requestIdRef = useRef(0);

  const refetch = useCallback(async (): Promise<SubscriptionStatus> => {
    const requestId = ++requestIdRef.current;

    if (!userId) {
      statusRef.current = "free";
      setStatus("free");
      setCurrentPeriodEnd(null);
      setIsLoading(false);
      return "free";
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();

    if (requestId !== requestIdRef.current) return statusRef.current;

    if (error) {
      setIsLoading(false);
      return statusRef.current;
    }

    const nextStatus: SubscriptionStatus = data?.status ?? "free";
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    setCurrentPeriodEnd(data?.current_period_end ?? null);
    setIsLoading(false);
    return nextStatus;
  }, [userId]);

  useEffect(() => {
    setIsLoading(true);
    void refetch();
  }, [refetch]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      status,
      isPro: status === "active",
      currentPeriodEnd,
      isLoading,
      refetch,
    }),
    [status, currentPeriodEnd, isLoading, refetch],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}