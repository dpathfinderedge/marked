import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cleanChecklistItems, readChecklistItems } from "@/lib/calculations";

interface UseChecklistResult {
  items: string[];
  isLoading: boolean;
  error: string | null;
  saveItems: (items: string[]) => Promise<{ error: string | null; items: string[] }>;
}

export function useChecklist(): UseChecklistResult {
  const { user } = useAuth();
  const [items, setItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("user_settings")
        .select("checklist_items")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (fetchError) {
        setError("We couldn't load your checklist.");
      } else {
        setError(null);
        setItems(readChecklistItems(data?.checklist_items));
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveItems = useCallback(
    async (next: string[]) => {
      const cleaned = cleanChecklistItems(next);
      if (!user) return { error: "Not signed in.", items: cleaned };

      const { error: upsertError } = await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, checklist_items: cleaned }, { onConflict: "user_id" });

      if (upsertError) return { error: "We couldn't save your checklist. Try again.", items: cleaned };

      setItems(cleaned);
      return { error: null, items: cleaned };
    },
    [user],
  );

  return { items, isLoading, error, saveItems };
}