import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { NO_RISK_RULES, readRiskRules, type RiskRules } from "@/lib/calculations";

interface UseRiskRulesResult {
  rules: RiskRules;
  isLoading: boolean;
  error: string | null;
  saveRules: (rules: RiskRules) => Promise<{ error: string | null }>;
}

export function useRiskRules(): UseRiskRulesResult {
  const { user } = useAuth();
  const [rules, setRules] = useState<RiskRules>(NO_RISK_RULES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRules(NO_RISK_RULES);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("user_settings")
        .select("daily_loss_limit, max_trades_per_day, monthly_profit_target")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (fetchError) {
        setError("We couldn't load your limits.");
      } else {
        setError(null);
        setRules(readRiskRules(data));
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveRules = useCallback(
    async (next: RiskRules) => {
      if (!user) return { error: "Not signed in." };

      const { error: upsertError } = await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          daily_loss_limit: next.dailyLossLimit,
          max_trades_per_day: next.maxTradesPerDay,
          monthly_profit_target: next.monthlyTarget,
        },
        { onConflict: "user_id" },
      );
      if (upsertError) return { error: "We couldn't save your limits. Try again." };

      setRules(next);
      return { error: null };
    },
    [user],
  );

  return { rules, isLoading, error, saveRules };
}