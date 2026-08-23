import Papa from "papaparse";
import {
  calculateForexPnl,
  calculateCryptoPnl,
  calculateRMultiple,
  ForexCrossPairError,
} from "@/lib/calculations";
import type { NewTradeInput } from "@/utils/tradeMappers";
import type {
  ContractSize,
  Direction,
  Market,
  Session,
} from "@/types/trade";

export interface CsvImportRow {
  rowNumber: number;
  trade: NewTradeInput | null;
  error: string | null;
}

const VALID_MARKETS: Market[] = ["forex", "crypto"];
const VALID_DIRECTIONS: Direction[] = ["long", "short"];
const VALID_SESSIONS: Session[] = ["Asian", "London", "New York", "Overlap"];
const VALID_CONTRACT_SIZES: ContractSize[] = [
  "standard",
  "mini",
  "micro",
  "custom",
];

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function isMarket(value: string): value is Market {
  return (VALID_MARKETS as string[]).includes(value);
}

function isDirection(value: string): value is Direction {
  return (VALID_DIRECTIONS as string[]).includes(value);
}

function isSession(value: string): value is Session {
  return (VALID_SESSIONS as string[]).includes(value);
}

function isContractSize(value: string): value is ContractSize {
  return (VALID_CONTRACT_SIZES as string[]).includes(value);
}

function validateRow(
  raw: Record<string, string>,
  rowNumber: number,
): CsvImportRow {
  const date = raw.date?.trim() ?? "";
  const marketRaw = raw.market?.trim().toLowerCase() ?? "";
  const pair = raw.pair?.trim() ?? "";
  const directionRaw = raw.direction?.trim().toLowerCase() ?? "";
  const session = (raw.session?.trim() ?? "") as string;
  const tag = raw.tag?.trim() ?? "";
  const notes = raw.notes?.trim() ?? "";

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      rowNumber,
      trade: null,
      error: "Missing or invalid date (expected YYYY-MM-DD).",
    };
  }
  if (!isMarket(marketRaw)) {
    return {
      rowNumber,
      trade: null,
      error: 'market must be "forex" or "crypto".',
    };
  }
  if (!pair) {
    return { rowNumber, trade: null, error: "Missing pair." };
  }
  if (!isDirection(directionRaw)) {
    return {
      rowNumber,
      trade: null,
      error: 'direction must be "long" or "short".',
    };
  }
  if (!isSession(session)) {
    return {
      rowNumber,
      trade: null,
      error: `session must be one of: ${VALID_SESSIONS.join(", ")}.`,
    };
  }

  const entryPrice = parseNumber(raw.entryPrice);
  const exitPrice = parseNumber(raw.exitPrice);
  if (entryPrice === null || exitPrice === null) {
    return {
      rowNumber,
      trade: null,
      error: "Missing or invalid entryPrice/exitPrice.",
    };
  }

  const risk = parseNumber(raw.risk);
  const manualPnl = parseNumber(raw.manualPnl);
  const market = marketRaw;
  const direction = directionRaw;

  let pnl: number;
  let pips: number | null = null;
  let calcMode: "direct" | "converted" | "manual";

  if (market === "crypto") {
    const quantity = parseNumber(raw.quantity);
    if (quantity === null) {
      return {
        rowNumber,
        trade: null,
        error: "Missing or invalid quantity for a crypto trade.",
      };
    }
    pnl = calculateCryptoPnl({ direction, entryPrice, exitPrice, quantity });
    calcMode = "direct";
  } else {
    const lots = parseNumber(raw.lots);
    if (lots === null) {
      return {
        rowNumber,
        trade: null,
        error: "Missing or invalid lots for a forex trade.",
      };
    }

    const contractSizeRaw = raw.contractSize?.trim().toLowerCase() || "standard";
    if (!isContractSize(contractSizeRaw)) {
      return {
        rowNumber,
        trade: null,
        error: `contractSize must be one of: ${VALID_CONTRACT_SIZES.join(", ")}.`,
      };
    }
    const customContractUnits =
      parseNumber(raw.customContractUnits) ?? undefined;

    try {
      const result = calculateForexPnl({
        pair,
        direction,
        entryPrice,
        exitPrice,
        lots,
        contractSize: contractSizeRaw,
        customContractUnits,
      });
      pnl = result.pnl;
      pips = result.pips;
      calcMode = result.calcMode;
    } catch (err) {
      if (err instanceof ForexCrossPairError) {
        if (manualPnl === null) {
          return {
            rowNumber,
            trade: null,
            error: `${pair} is a cross pair — add a manualPnl value for this row.`,
          };
        }
        pnl = manualPnl;
        calcMode = "manual";
      } else {
        return {
          rowNumber,
          trade: null,
          error: "Could not calculate P&L for this row.",
        };
      }
    }
  }

  return {
    rowNumber,
    trade: {
      date,
      market,
      pair: market === "forex" ? pair.toUpperCase() : pair,
      direction,
      session,
      tag,
      risk,
      pnl,
      pips,
      rMultiple: calculateRMultiple(pnl, risk),
      notes,
      calcMode,
    },
    error: null,
  };
}

export interface ParseTradesCsvResult {
  rows: CsvImportRow[];
  validCount: number;
  errorCount: number;
}

export function parseTradesCsv(csvText: string): ParseTradesCsvResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data.map((raw, i) => validateRow(raw, i + 2));

  return {
    rows,
    validCount: rows.filter((r) => r.trade !== null).length,
    errorCount: rows.filter((r) => r.error !== null).length,
  };
}