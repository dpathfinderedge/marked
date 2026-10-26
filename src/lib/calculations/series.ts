import type { Trade } from "@/types/trade";
import { addDaysToIso, weekdayOfIso } from "@/utils/dates";

export type EquityRange = "1W" | "1M" | "3M" | "6M" | "ALL";

export const RANGE_DAYS: Record<EquityRange, number | null> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 182,
  ALL: null,
};

export interface DailyPoint {
  date: string;
  pnl: number;
  trades: number;
  cumulativePnl: number;
  drawdown: number;
}

interface DayTotals {
  pnl: number;
  trades: number;
}

function totalsByDate(trades: Trade[]): Map<string, DayTotals> {
  const byDate = new Map<string, DayTotals>();
  for (const trade of trades) {
    const day = byDate.get(trade.date) ?? { pnl: 0, trades: 0 };
    day.pnl += trade.pnl;
    day.trades += 1;
    byDate.set(trade.date, day);
  }
  return byDate;
}

export function buildEquitySeries(
  trades: Trade[],
  range: EquityRange,
  today: string,
): DailyPoint[] {
  if (trades.length === 0) return [];

  const byDate = totalsByDate(trades);
  const dates = [...byDate.keys()].sort();
  const firstDate = dates[0] as string;
  const lastDate = dates[dates.length - 1] as string;

  const days = RANGE_DAYS[range];
  const rangeStart = days === null ? firstDate : addDaysToIso(today, -(days - 1));
  const startDate = rangeStart > firstDate ? rangeStart : firstDate;
  const endDate = today > lastDate ? today : lastDate;

  const points: DailyPoint[] = [
    {
      date: addDaysToIso(startDate, -1),
      pnl: 0,
      trades: 0,
      cumulativePnl: 0,
      drawdown: 0,
    },
  ];

  let cumulative = 0;
  let peak = 0;
  for (let date = startDate; date <= endDate; date = addDaysToIso(date, 1)) {
    const day = byDate.get(date);
    cumulative += day?.pnl ?? 0;
    peak = Math.max(peak, cumulative);
    points.push({
      date,
      pnl: day?.pnl ?? 0,
      trades: day?.trades ?? 0,
      cumulativePnl: cumulative,
      drawdown: cumulative - peak,
    });
  }

  return points;
}

export interface SeriesSummary {
  rangePnl: number;
  maxDrawdown: number;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  /** Days with at least one trade. */
  tradingDays: number;
}

export function summarizeSeries(points: DailyPoint[]): SeriesSummary {
  const tradedDays = points.filter((p) => p.trades > 0);
  let best: DailyPoint | null = null;
  let worst: DailyPoint | null = null;
  for (const day of tradedDays) {
    if (best === null || day.pnl > best.pnl) best = day;
    if (worst === null || day.pnl < worst.pnl) worst = day;
  }

  return {
    rangePnl: points[points.length - 1]?.cumulativePnl ?? 0,
    maxDrawdown: points.reduce((min, p) => Math.min(min, p.drawdown), 0),
    bestDay: best ? { date: best.date, pnl: best.pnl } : null,
    worstDay: worst ? { date: worst.date, pnl: worst.pnl } : null,
    tradingDays: tradedDays.length,
  };
}

export interface WeekdayStats {
  label: string;
  pnl: number;
  trades: number;
}

const WEEKDAY_ORDER = [
  { label: "Mon", index: 1 },
  { label: "Tue", index: 2 },
  { label: "Wed", index: 3 },
  { label: "Thu", index: 4 },
  { label: "Fri", index: 5 },
  { label: "Sat", index: 6 },
  { label: "Sun", index: 0 },
];

export function calculateWeekdayPnl(trades: Trade[]): WeekdayStats[] {
  const stats = WEEKDAY_ORDER.map(({ label, index }) => ({
    label,
    index,
    pnl: 0,
    trades: 0,
  }));
  for (const trade of trades) {
    const entry = stats.find((s) => s.index === weekdayOfIso(trade.date));
    if (entry) {
      entry.pnl += trade.pnl;
      entry.trades += 1;
    }
  }
  return stats.map(({ label, pnl, trades: count }) => ({
    label,
    pnl,
    trades: count,
  }));
}