import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_THRESHOLD = 2;

interface UseSettingsResult {
  threshold: number;
  isLoading: boolean;
  error: string | null;
  updateThreshold: (value: number) => Promise<{ error: string | null }>;
}

export function useSettings(): UseSettingsResult {
  const { user } = useAuth();
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setError(null);
        if (data) setThreshold(data.consecutive_loss_threshold);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateThreshold = async (
    value: number,
  ): Promise<{ error: string | null }> => {
    if (!user) return { error: "Not signed in." };

    const { error: upsertError } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, consecutive_loss_threshold: value },
        { onConflict: "user_id" },
      );

    if (upsertError) return { error: upsertError.message };

    setThreshold(value);
    return { error: null };
  };

  return { threshold, isLoading, error, updateThreshold };
}