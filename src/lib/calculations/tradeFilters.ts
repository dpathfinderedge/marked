import type { Direction, Market, Session, Trade } from "@/types/trade";
import { addDaysToIso, daysInMonth, formatShortDate, monthOfIso, shiftMonth } from "@/utils/dates";

export interface TradeFilters {
  search: string;
  market: "all" | Market;
  direction: "all" | Direction;
  result: "all" | "win" | "loss";
  session: "all" | Session;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: TradeFilters = {
  search: "",
  market: "all",
  direction: "all",
  result: "all",
  session: "all",
  from: "",
  to: "",
};

export function countActiveFilters(filters: TradeFilters): number {
  let count = 0;
  if (filters.search.trim() !== "") count++;
  if (filters.market !== "all") count++;
  if (filters.direction !== "all") count++;
  if (filters.result !== "all") count++;
  if (filters.session !== "all") count++;
  if (filters.from !== "" || filters.to !== "") count++;
  return count;
}

export function filterTrades(trades: Trade[], filters: TradeFilters): Trade[] {
  const words = filters.search.toLowerCase().split(/\s+/).filter(Boolean);

  return trades.filter((trade) => {
    if (filters.market !== "all" && trade.market !== filters.market) return false;
    if (filters.direction !== "all" && trade.direction !== filters.direction) return false;
    if (filters.session !== "all" && trade.session !== filters.session) return false;
    if (filters.result === "win" && trade.pnl <= 0) return false;
    if (filters.result === "loss" && trade.pnl >= 0) return false;
    if (filters.from !== "" && trade.date < filters.from) return false;
    if (filters.to !== "" && trade.date > filters.to) return false;

    if (words.length > 0) {
      const haystack = `${trade.pair} ${trade.tag} ${trade.notes}`.toLowerCase();
      if (!words.every((word) => haystack.includes(word))) return false;
    }
    return true;
  });
}

export type SortKey = "date" | "pair" | "r" | "pnl";
export type SortDirection = "asc" | "desc";

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export const DEFAULT_SORT: SortState = { key: "date", direction: "desc" };

export function defaultDirectionFor(key: SortKey): SortDirection {
  return key === "pair" ? "asc" : "desc";
}

export function sortTrades(trades: Trade[], sort: SortState): Trade[] {
  const sign = sort.direction === "asc" ? 1 : -1;

  const compare = (a: Trade, b: Trade): number => {
    switch (sort.key) {
      case "pair":
        return sign * a.pair.localeCompare(b.pair);
      case "pnl":
        return sign * (a.pnl - b.pnl);
      case "r": {
        if (a.rMultiple === null && b.rMultiple === null) return 0;
        if (a.rMultiple === null) return 1;
        if (b.rMultiple === null) return -1;
        return sign * (a.rMultiple - b.rMultiple);
      }
      case "date":
      default:
        return sign * a.date.localeCompare(b.date);
    }
  };

  return [...trades].sort(
    (a, b) => compare(a, b) || sign * a.createdAt.localeCompare(b.createdAt),
  );
}

export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
}

export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);

  return {
    items: slice,
    page: current,
    pageCount,
    total,
    from: slice.length === 0 ? 0 : start + 1,
    to: start + slice.length,
  };
}

export function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((n) => wanted.add(n));

  const pages = [...wanted]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);

  const result: (number | "…")[] = [];
  pages.forEach((n, i) => {
    const previous = pages[i - 1];
    if (previous !== undefined && n - previous === 2) result.push(previous + 1);
    else if (previous !== undefined && n - previous > 2) result.push("…");
    result.push(n);
  });
  return result;
}

export type DatePreset = "all" | "7d" | "30d" | "month" | "lastMonth" | "year";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "year", label: "This year" },
];

export function presetRange(
  preset: DatePreset,
  today: string,
): { from: string; to: string } {
  switch (preset) {
    case "7d":
      return { from: addDaysToIso(today, -6), to: today };
    case "30d":
      return { from: addDaysToIso(today, -29), to: today };
    case "month": {
      const month = monthOfIso(today);
      return { from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, "0")}` };
    }
    case "lastMonth": {
      const month = shiftMonth(monthOfIso(today), -1);
      return { from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, "0")}` };
    }
    case "year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case "all":
    default:
      return { from: "", to: "" };
  }
}

export function detectPreset(from: string, to: string, today: string): DatePreset | null {
  for (const { value } of DATE_PRESETS) {
    const range = presetRange(value, today);
    if (range.from === from && range.to === to) return value;
  }
  return null;
}

export function formatRangeLabel(from: string, to: string): string {
  if (from === "" && to === "") return "All time";
  if (from !== "" && to === "") return `From ${formatShortDate(from)}`;
  if (from === "" && to !== "") return `Until ${formatShortDate(to)}`;
  return `${formatShortDate(from)} – ${formatShortDate(to)}`;
}