import type { Database } from "@/types/database";
import type { Trade } from "@/types/trade";

type TradeRow = Database["public"]["Tables"]["trades"]["Row"];
type TradeInsert = Database["public"]["Tables"]["trades"]["Insert"];

export function rowToTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    pair: row.pair,
    market: row.market,
    direction: row.direction,
    session: row.session,
    tag: row.tag,
    risk: row.risk,
    pnl: row.pnl,
    pips: row.pips,
    rMultiple: row.r_multiple,
    notes: row.notes,
    calcMode: row.calc_mode,
  };
}

export type NewTradeInput = Omit<Trade, "id" | "userId">;

export function newTradeToRow(input: NewTradeInput, userId: string): TradeInsert {
  return {
    user_id: userId,
    date: input.date,
    pair: input.pair,
    market: input.market,
    direction: input.direction,
    session: input.session,
    tag: input.tag,
    risk: input.risk,
    pnl: input.pnl,
    pips: input.pips,
    r_multiple: input.rMultiple,
    notes: input.notes,
    calc_mode: input.calcMode,
  };
}