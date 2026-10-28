import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getFunctionErrorMessage } from "@/lib/functionError";
import type { NewsPayload } from "@/lib/news/news";

const REFRESH_MS = 5 * 60 * 1000;

interface MarketNewsState<T> {
  data: NewsPayload<T> | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useMarketNews<T>(
  kind: "calendar" | "headlines",
  parse: (raw: unknown) => NewsPayload<T> | null,
): MarketNewsState<T> {
  const [data, setData] = useState<NewsPayload<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const load = useCallback(async (): Promise<void> => {
    const { data: raw, error: invokeError } = await supabase.functions.invoke("market-news", {
      body: { kind },
    });
    if (!isMounted.current) return;

    if (invokeError) {
      setError(
        await getFunctionErrorMessage(invokeError, "We couldn't load this right now. Try again."),
      );
    } else {
      const parsed = parse(raw);
      if (parsed) {
        setData(parsed);
        setError(null);
      } else {
        setError("We couldn't read the response. Try again in a moment.");
      }
    }
    setIsLoading(false);
  }, [kind, parse]);

  useEffect(() => {
    isMounted.current = true;
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      isMounted.current = false;
      window.clearInterval(timer);
    };
  }, [load]);

  const reload = useCallback(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  return { data, isLoading, error, reload };
}