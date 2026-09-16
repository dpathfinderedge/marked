import Papa from "papaparse";
import {
  calculateForexPnl,
  calculateCrossPairPnl,
  calculateCryptoPnl,
  calculateRMultiple,
  ForexCrossPairError,
} from "@/lib/calculations";
import { fetchFxRate, FxRateError } from "@/lib/fx/fetchFxRate";
import type { NewTradeInput } from "@/utils/tradeMappers";
import type {
  ContractSize,
  Direction,
  Market,
  Session,
} from "@/types/trade";

export interface PendingCrossPairRow {
  date: string;
  pair: string;
  direction: Direction;
  session: Session;
  tag: string;
  risk: number | null;
  notes: string;
  entryPrice: number;
  exitPrice: number;
  lots: number;
  contractSize: ContractSize;
  customContractUnits?: number;
}

export interface CsvImportRow {
  rowNumber: number;
  trade: NewTradeInput | null;
  error: string | null;
  pendingCrossPair?: PendingCrossPairRow;
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
            error: `${pair} is a cross pair — add a manualPnl value, or use "Look up live rates" below.`,
            pendingCrossPair: {
              date,
              pair,
              direction,
              session,
              tag,
              risk,
              notes,
              entryPrice,
              exitPrice,
              lots,
              contractSize: contractSizeRaw,
              customContractUnits,
            },
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

export async function resolveCrossPairRates(
  rows: CsvImportRow[],
): Promise<CsvImportRow[]> {
  const quoteCurrencies = Array.from(
    new Set(
      rows
        .filter((r) => r.pendingCrossPair)
        .map((r) => r.pendingCrossPair!.pair.toUpperCase().slice(3, 6)),
    ),
  );

  if (quoteCurrencies.length === 0) return rows;

  const rateEntries = await Promise.all(
    quoteCurrencies.map(async (currency) => {
      try {
        const { rate } = await fetchFxRate(currency, "USD");
        return [currency, rate] as const;
      } catch (err) {
        const message =
          err instanceof FxRateError ? err.message : "Couldn't fetch a rate.";
        return [currency, message] as const;
      }
    }),
  );
  const rateResults = new Map<string, number | string>(rateEntries);

  return rows.map((row) => {
    if (!row.pendingCrossPair) return row;

    const input = row.pendingCrossPair;
    const quoteCurrency = input.pair.toUpperCase().slice(3, 6);
    const result = rateResults.get(quoteCurrency);

    if (typeof result !== "number") {
      return {
        ...row,
        error:
          typeof result === "string"
            ? `${quoteCurrency}USD: ${result}`
            : `Couldn't fetch a rate for ${quoteCurrency}USD.`,
      };
    }

    const { pnl, pips } = calculateCrossPairPnl({
      pair: input.pair,
      direction: input.direction,
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice,
      lots: input.lots,
      contractSize: input.contractSize,
      customContractUnits: input.customContractUnits,
      quoteToUsdRate: result,
    });

    return {
      rowNumber: row.rowNumber,
      trade: {
        date: input.date,
        market: "forex",
        pair: input.pair.toUpperCase(),
        direction: input.direction,
        session: input.session,
        tag: input.tag,
        risk: input.risk,
        pnl,
        pips,
        rMultiple: calculateRMultiple(pnl, input.risk),
        notes: input.notes,
        calcMode: "manual",
      },
      error: null,
    };
  });
}