import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cleanRecap } from "@/lib/calculations";

interface UseDailyRecapResult {
  note: string | null;
  isLoading: boolean;
  error: string | null;
  save: (note: string) => Promise<{ error: string | null }>;
}

export function useDailyRecap(date: string): UseDailyRecapResult {
  const { user } = useAuth();
  const [note, setNote] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNote(null);
    setError(null);
    if (!user) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("daily_recaps")
        .select("note")
        .eq("user_id", user.id)
        .eq("date", date)
        .maybeSingle();
      if (cancelled) return;

      if (fetchError) setError("We couldn't load this day's recap.");
      else setNote(data?.note ?? null);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, date]);

  const save = useCallback(
    async (raw: string): Promise<{ error: string | null }> => {
      if (!user) return { error: "Not signed in." };
      const cleaned = cleanRecap(raw);

      if (cleaned === "") {
        const { error: deleteError } = await supabase
          .from("daily_recaps")
          .delete()
          .eq("user_id", user.id)
          .eq("date", date);
        if (deleteError) return { error: "We couldn't remove the recap. Try again." };
        setNote(null);
        return { error: null };
      }

      const { error: upsertError } = await supabase
        .from("daily_recaps")
        .upsert(
          { user_id: user.id, date, note: cleaned, updated_at: new Date().toISOString() },
          { onConflict: "user_id,date" },
        );
      if (upsertError) return { error: "We couldn't save the recap. Try again." };
      setNote(cleaned);
      return { error: null };
    },
    [user, date],
  );

  return { note, isLoading, error, save };
}