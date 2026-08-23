import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { rowToTrade, newTradeToRow, type NewTradeInput } from "@/utils/tradeMappers";
import type { Trade } from "@/types/trade";

interface UseTradesResult {
  trades: Trade[];
  isLoading: boolean;
  error: string | null;
  addTrade: (
    input: NewTradeInput,
  ) => Promise<{ error: string | null; trade?: Trade }>;
  addTrades: (
    inputs: NewTradeInput[],
  ) => Promise<{ error: string | null; count: number }>;
  refetch: () => Promise<void>;
}

export function useTrades(): UseTradesResult {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    if (!user) {
      setTrades([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error: fetchError } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setTrades((data ?? []).map(rowToTrade));
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchTrades();
  }, [fetchTrades]);

  const addTrade = async (
    input: NewTradeInput,
  ): Promise<{ error: string | null; trade?: Trade }> => {
    if (!user) return { error: "Not signed in." };

    const { data, error: insertError } = await supabase
      .from("trades")
      .insert(newTradeToRow(input, user.id))
      .select()
      .single();

    if (insertError) return { error: insertError.message };

    const trade = rowToTrade(data);
    setTrades((prev) => [trade, ...prev]);
    return { error: null, trade };
  };

  const addTrades = async (
    inputs: NewTradeInput[],
  ): Promise<{ error: string | null; count: number }> => {
    if (!user) return { error: "Not signed in.", count: 0 };
    if (inputs.length === 0) return { error: null, count: 0 };

    const { data, error: insertError } = await supabase
      .from("trades")
      .insert(inputs.map((input) => newTradeToRow(input, user.id)))
      .select();

    if (insertError) return { error: insertError.message, count: 0 };

    const inserted = (data ?? []).map(rowToTrade);
    setTrades((prev) => [...inserted, ...prev]);
    return { error: null, count: inserted.length };
  };

  return { trades, isLoading, error, addTrade, addTrades, refetch: fetchTrades };
}