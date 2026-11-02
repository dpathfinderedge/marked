import Papa from "papaparse";
import type { Direction, Market, Session, Trade } from "@/types/trade";
import type { NewTradeInput } from "@/utils/tradeMappers";
import type { CsvImportRow } from "@/lib/csv/parseTradesCsv";

export type BrokerLayout = "positions" | "deals";

export interface BrokerParseOptions {
  utcOffsetHours: number;
}

export interface BrokerParseResult {
  layout: BrokerLayout | null;
  rows: CsvImportRow[];
  ignoredCount: number;
  fileError: string | null;
}

const CRYPTO_BASES = [
  "BTC", "ETH", "SOL", "XRP", "LTC", "ADA", "DOGE", "BNB", "DOT", "AVAX", "LINK", "MATIC", "TRX", "BCH",
];

export function normalizeSymbol(raw: string): string {
  let s = raw.trim().toUpperCase().replace(/[._#\-/].*$/, "");
  const suffixed = /^([A-Z]{6})(M|C|I|PRO|ECN|RAW)$/.exec(s);
  if (suffixed?.[1]) s = suffixed[1];
  return s;
}

export function marketForSymbol(symbol: string): Market {
  return CRYPTO_BASES.some((b) => symbol.startsWith(b)) ? "crypto" : "forex";
}

export function parseBrokerNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.replace(/[\s\u00a0]/g, "").replace(/\u2212/g, "-");
  if (s === "" || s === "-") return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/,/g, "");
  else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

export interface BrokerTime {
  date: string;
  hour: number;
}

export function parseBrokerTime(raw: string | undefined): BrokerTime | null {
  if (!raw) return null;
  const m = /^\s*(\d{4})[.\-/](\d{2})[.\-/](\d{2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(raw);
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, hour: m[4] ? Number(m[4]) : 12 };
}

export function sessionForHour(brokerHour: number, utcOffsetHours: number): Session {
  const utc = (((brokerHour - utcOffsetHours) % 24) + 24) % 24;
  if (utc >= 7 && utc < 12) return "London";
  if (utc >= 12 && utc < 16) return "Overlap";
  if (utc >= 16 && utc < 21) return "New York";
  return "Asian";
}

interface Columns {
  symbol: number;
  type: number;
  volume: number;
  profit: number;
  commission: number;
  fee: number;
  taxes: number;
  swap: number;
  ticket: number;
  direction: number;
  deal: number;
  openTime: number;
  closeTime: number;
  times: number[];
}

const clean = (cell: string | undefined): string => (cell ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function indexOfAny(cells: string[], names: string[]): number {
  return cells.findIndex((c) => names.includes(c));
}

function isHeaderRow(cells: string[]): boolean {
  return indexOfAny(cells, ["symbol", "item", "instrument"]) >= 0 && cells.includes("profit");
}

function readColumns(cells: string[]): Columns {
  return {
    symbol: indexOfAny(cells, ["symbol", "item", "instrument"]),
    type: indexOfAny(cells, ["type"]),
    volume: indexOfAny(cells, ["volume", "size", "lots"]),
    profit: cells.indexOf("profit"),
    commission: indexOfAny(cells, ["commission"]),
    fee: indexOfAny(cells, ["fee"]),
    taxes: indexOfAny(cells, ["taxes", "tax"]),
    swap: indexOfAny(cells, ["swap"]),
    ticket: indexOfAny(cells, ["ticket", "position"]),
    direction: indexOfAny(cells, ["direction"]),
    deal: indexOfAny(cells, ["deal"]),
    openTime: indexOfAny(cells, ["open time", "opening time"]),
    closeTime: indexOfAny(cells, ["close time", "closing time"]),
    times: cells.flatMap((c, i) => (c === "time" ? [i] : [])),
  };
}

const money = (row: string[], index: number): number =>
  index < 0 ? 0 : (parseBrokerNumber(row[index]) ?? 0);

function fail(rowNumber: number, error: string): CsvImportRow {
  return { rowNumber, trade: null, error };
}

export function parseBrokerCsv(csvText: string, options: BrokerParseOptions): BrokerParseResult {
  const text = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;
  const parsed = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
  const data = parsed.data;

  const headerIndex = data.findIndex((row, i) => i < 40 && isHeaderRow(row.map(clean)));
  if (headerIndex < 0) {
    return {
      layout: null,
      rows: [],
      ignoredCount: 0,
      fileError:
        "This doesn't look like an MT4 or MT5 trade history. Look for a header row with Symbol (or Item) and Profit.",
    };
  }

  const cols = readColumns((data[headerIndex] ?? []).map(clean));
  const layout: BrokerLayout = cols.direction >= 0 && cols.deal >= 0 ? "deals" : "positions";

  if (cols.type < 0) {
    return { layout, rows: [], ignoredCount: 0, fileError: "The Type column is missing from this file." };
  }
  const openIdx = cols.openTime >= 0 ? cols.openTime : (cols.times[0] ?? -1);
  const closeIdx =
    cols.closeTime >= 0 ? cols.closeTime : cols.times.length >= 2 ? (cols.times[cols.times.length - 1] ?? -1) : -1;
  const dealTimeIdx = cols.times[0] ?? -1;
  if (layout === "positions" && closeIdx < 0) {
    return { layout, rows: [], ignoredCount: 0, fileError: "The close time column is missing from this file." };
  }
  if (layout === "deals" && dealTimeIdx < 0) {
    return { layout, rows: [], ignoredCount: 0, fileError: "The Time column is missing from this file." };
  }

  const rows: CsvImportRow[] = [];
  let ignoredCount = 0;

  for (let i = headerIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const rowNumber = i + 1;
    if (isHeaderRow(row.map(clean))) break;

    const type = clean(row[cols.type]);
    const symbolRaw = (row[cols.symbol] ?? "").trim();
    if ((type !== "buy" && type !== "sell") || symbolRaw === "") {
      ignoredCount++;
      continue;
    }

    let direction: Direction = type === "buy" ? "long" : "short";
    let timeCell: string | undefined;
    if (layout === "deals") {
      const flow = clean(row[cols.direction]);
      if (flow === "in") {
        ignoredCount++;
        continue;
      }
      direction = type === "sell" ? "long" : "short";
      timeCell = row[dealTimeIdx];
    } else {
      timeCell = row[closeIdx];
    }

    const closed = parseBrokerTime(timeCell);
    if (!closed) {
      rows.push(fail(rowNumber, "Couldn't read the close time."));
      continue;
    }
    const profit = parseBrokerNumber(row[cols.profit]);
    if (profit === null) {
      rows.push(fail(rowNumber, "Missing or invalid profit."));
      continue;
    }

    const opened = layout === "positions" && openIdx >= 0 ? parseBrokerTime(row[openIdx]) : null;
    const symbol = normalizeSymbol(symbolRaw);
    if (symbol === "") {
      rows.push(fail(rowNumber, "Missing symbol."));
      continue;
    }

    const pnl =
      Math.round(
        (profit + money(row, cols.commission) + money(row, cols.fee) + money(row, cols.taxes) + money(row, cols.swap)) *
          100,
      ) / 100;

    const ticket = cols.ticket >= 0 ? (row[cols.ticket] ?? "").trim() : "";
    const trade: NewTradeInput = {
      date: closed.date,
      market: marketForSymbol(symbol),
      pair: symbol,
      direction,
      session: sessionForHour((opened ?? closed).hour, options.utcOffsetHours),
      tag: "",
      risk: null,
      pnl,
      pips: null,
      rMultiple: null,
      notes: ticket ? `Imported from MetaTrader · ticket ${ticket}` : "Imported from MetaTrader",
      calcMode: "manual",
      checklistPassed: null,
      checklistTotal: null,
    };
    rows.push({ rowNumber, trade, error: null });
  }

  return { layout, rows, ignoredCount, fileError: null };
}

function duplicateKey(t: Pick<Trade, "date" | "pair" | "direction" | "pnl">): string {
  return `${t.date}|${t.pair.toUpperCase()}|${t.direction}|${t.pnl.toFixed(2)}`;
}

export function findDuplicateRows(rows: CsvImportRow[], existing: Trade[]): Set<number> {
  const remaining = new Map<string, number>();
  for (const t of existing) {
    const key = duplicateKey(t);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  const duplicates = new Set<number>();
  for (const row of rows) {
    if (!row.trade) continue;
    const key = duplicateKey(row.trade);
    const left = remaining.get(key) ?? 0;
    if (left > 0) {
      duplicates.add(row.rowNumber);
      remaining.set(key, left - 1);
    }
  }
  return duplicates;
}