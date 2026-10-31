import Papa from "papaparse";
import type { Trade } from "@/types/trade";

const BOM = String.fromCharCode(0xfeff);

export const EXPORT_HEADERS = [
  "date",
  "pair",
  "market",
  "direction",
  "session",
  "setup",
  "pnl",
  "risk",
  "r_multiple",
  "pips",
  "pnl_source",
  "checklist",
  "notes",
] as const;

export function guardFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function checklistText(trade: Trade): string {
  return trade.checklistPassed !== null && trade.checklistTotal !== null
    ? `${trade.checklistPassed}/${trade.checklistTotal}`
    : "";
}

export function buildTradesCsv(trades: Trade[]): string {
  const data = trades.map((t) => [
    t.date,
    guardFormula(t.pair),
    t.market,
    t.direction,
    t.session,
    guardFormula(t.tag),
    t.pnl,
    t.risk ?? "",
    t.rMultiple ?? "",
    t.pips ?? "",
    t.calcMode,
    checklistText(t),
    guardFormula(t.notes),
  ]);
  const body = Papa.unparse({ fields: [...EXPORT_HEADERS], data }, { newline: "\r\n" });
  return `${BOM}${body}${body.endsWith("\r\n") ? "" : "\r\n"}`;
}

export function tradesCsvFilename(today: string): string {
  return `marked-trades-${today}.csv`;
}

export function downloadTradesCsv(trades: Trade[], today: string): void {
  const blob = new Blob([buildTradesCsv(trades)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = tradesCsvFilename(today);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}