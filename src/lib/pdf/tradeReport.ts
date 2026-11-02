import type { Trade } from "@/types/trade";
import {
  calculateAverageRMultiple,
  calculateEquityCurve,
  calculateLargestGain,
  calculateLargestLoss,
  calculateProfitFactor,
  calculateTotalPnl,
  calculateWinRate,
  downsample,
  formatRangeLabel,
  type TradeFilters,
} from "@/lib/calculations";
import { formatLongDate } from "@/utils/dates";

export type Tone = "good" | "bad" | "neutral";

export interface ReportStat {
  label: string;
  value: string;
  tone: Tone;
}

export interface ReportColumn {
  label: string;
  weight: number;
  align: "left" | "right";
}

export interface ReportRow {
  cells: string[];
  tone: Tone;
}

export interface ReportModel {
  title: string;
  period: string;
  filters: string[];
  generatedOn: string;
  stats: ReportStat[];
  equity: number[];
  columns: ReportColumn[];
  rows: ReportRow[];
}

export function pdfSafe(text: string): string {
  return text
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7e\u00a0-\u00ff]/g, "?");
}

function groupThousands(value: number, decimals: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function pdfMoney(value: number, signed = true): string {
  const sign = value < 0 ? "-" : signed ? "+" : "";
  return `${sign}$${groupThousands(Math.abs(value), 2)}`;
}

export function pdfCompactMoney(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const trim = (n: number): string => String(Number(n.toFixed(1)));
  if (abs >= 1_000_000) return `${sign}$${trim(abs / 1_000_000)}m`;
  if (abs >= 1_000) return `${sign}$${trim(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

const toneOf = (value: number): Tone => (value > 0 ? "good" : value < 0 ? "bad" : "neutral");

const MARKET_LABEL = { forex: "Forex", crypto: "Crypto" } as const;

export function describeFilters(filters: TradeFilters): string[] {
  const parts: string[] = [];
  if (filters.search.trim() !== "") parts.push(`Search "${filters.search.trim()}"`);
  if (filters.market !== "all") parts.push(`Market: ${MARKET_LABEL[filters.market]}`);
  if (filters.direction !== "all") parts.push(`Direction: ${filters.direction === "long" ? "Long" : "Short"}`);
  if (filters.result !== "all") parts.push(`Result: ${filters.result === "win" ? "Wins" : "Losses"}`);
  if (filters.session !== "all") parts.push(`Session: ${filters.session}`);
  if (filters.from !== "" || filters.to !== "") parts.push(`Dates: ${formatRangeLabel(filters.from, filters.to)}`);
  return parts.map(pdfSafe);
}

export function tradesPdfFilename(today: string): string {
  return `marked-report-${today}.pdf`;
}

export const REPORT_COLUMNS: ReportColumn[] = [
  { label: "Date", weight: 17, align: "left" },
  { label: "Pair", weight: 18, align: "left" },
  { label: "Side", weight: 10, align: "left" },
  { label: "Session", weight: 15, align: "left" },
  { label: "Setup", weight: 22, align: "left" },
  { label: "R", weight: 8, align: "right" },
  { label: "P&L", weight: 14, align: "right" },
];

export function buildTradeReport(
  trades: Trade[],
  options: { filters: string[]; generatedOn: string },
): ReportModel {
  const net = calculateTotalPnl(trades);
  const winRate = calculateWinRate(trades);
  const profitFactor = calculateProfitFactor(trades);
  const averageR = calculateAverageRMultiple(trades);
  const gain = calculateLargestGain(trades);
  const loss = calculateLargestLoss(trades);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl < 0).length;

  const dates = trades.map((t) => t.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  const period =
    first === undefined || last === undefined
      ? "No trades"
      : first === last
        ? formatLongDate(first)
        : `${formatLongDate(first)} to ${formatLongDate(last)}`;

  const stats: ReportStat[] = [
    { label: "Trades", value: String(trades.length), tone: "neutral" },
    { label: "Net P&L", value: trades.length ? pdfMoney(net) : "-", tone: toneOf(net) },
    { label: "Win rate", value: winRate === null ? "-" : `${Math.round(winRate * 100)}%`, tone: "neutral" },
    { label: "Profit factor", value: profitFactor === null ? "-" : profitFactor.toFixed(2), tone: "neutral" },
    { label: "Average R", value: averageR === null ? "-" : `${averageR.toFixed(2)}R`, tone: toneOf(averageR ?? 0) },
    { label: "Wins / losses", value: `${wins} / ${losses}`, tone: "neutral" },
    { label: "Largest gain", value: gain ? pdfMoney(gain.pnl) : "-", tone: gain ? "good" : "neutral" },
    { label: "Largest loss", value: loss ? pdfMoney(loss.pnl) : "-", tone: loss ? "bad" : "neutral" },
  ];

  const equity = downsample(calculateEquityCurve(trades).map((p) => p.cumulativePnl), 150);

  const rows: ReportRow[] = trades.map((t) => ({
    cells: [
      t.date,
      t.pair,
      t.direction === "long" ? "Long" : "Short",
      t.session,
      t.tag === "" ? "-" : t.tag,
      t.rMultiple === null ? "-" : `${t.rMultiple.toFixed(1)}R`,
      pdfMoney(t.pnl),
    ].map(pdfSafe),
    tone: toneOf(t.pnl),
  }));

  return {
    title: "Trade report",
    period,
    filters: options.filters,
    generatedOn: options.generatedOn,
    stats,
    equity,
    columns: REPORT_COLUMNS,
    rows,
  };
}