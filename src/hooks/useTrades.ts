import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { friendlyTradeError } from "@/lib/billing/serverRules";
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
  updateTrade: (
    id: string,
    patch: TradePatch,
  ) => Promise<{ error: string | null }>;
  deleteTrade: (id: string) => Promise<{ error: string | null }>;
  refetch: () => Promise<void>;
}

export interface TradePatch {
  notes?: string;
  tag?: string;
}

const ATTACHMENTS_BUCKET = "trade-attachments";

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

    if (insertError) return { error: friendlyTradeError(insertError.message) };

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

    if (insertError) {
      return { error: friendlyTradeError(insertError.message), count: 0 };
    }

    const inserted = (data ?? []).map(rowToTrade);
    setTrades((prev) => [...inserted, ...prev]);
    return { error: null, count: inserted.length };
  };

  const updateTrade = async (
    id: string,
    patch: TradePatch,
  ): Promise<{ error: string | null }> => {
    const { error: updateError } = await supabase
      .from("trades")
      .update(patch)
      .eq("id", id);

    if (updateError) return { error: friendlyTradeError(updateError.message) };

    setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    return { error: null };
  };

  const deleteTrade = async (id: string): Promise<{ error: string | null }> => {
    const { data: attachments } = await supabase
      .from("trade_attachments")
      .select("storage_path")
      .eq("trade_id", id);

    const paths = (attachments ?? []).map((row) => row.storage_path);
    if (paths.length > 0) {
      await supabase.storage.from(ATTACHMENTS_BUCKET).remove(paths);
    }

    const { error: deleteError } = await supabase
      .from("trades")
      .delete()
      .eq("id", id);

    if (deleteError) return { error: deleteError.message };

    setTrades((prev) => prev.filter((t) => t.id !== id));
    return { error: null };
  };

  return {
    trades,
    isLoading,
    error,
    addTrade,
    addTrades,
    updateTrade,
    deleteTrade,
    refetch: fetchTrades,
  };
}