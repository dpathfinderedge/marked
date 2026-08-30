import type { Trade } from "@/types/trade";

let counter = 0;

export function makeTrade(overrides: Partial<Trade> = {}): Trade {
  counter++;
  return {
    id: `trade-${counter}`,
    userId: "user-1",
    date: "2026-01-01",
    pair: "EURUSD",
    market: "forex",
    direction: "long",
    session: "London",
    tag: "",
    risk: null,
    pnl: 0,
    pips: null,
    rMultiple: null,
    notes: "",
    calcMode: "direct",
    ...overrides,
  };
}