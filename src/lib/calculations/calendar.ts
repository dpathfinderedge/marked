import type { Trade } from "@/types/trade";
import { addDaysToIso, daysInMonth, weekdayOfIso } from "@/utils/dates";

export interface CalendarDay {
  date: string;
  inMonth: boolean;
  pnl: number;
  trades: number;
}

export interface CalendarWeek {
  days: CalendarDay[];
  pnl: number;
  trades: number;
}

export interface MonthSummary {
  pnl: number;
  trades: number;
  tradingDays: number;
  greenDays: number;
  redDays: number;
  maxAbsDay: number;
}

function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildMonthGrid(month: string, trades: Trade[]): CalendarWeek[] {
  const byDate = new Map<string, { pnl: number; trades: number }>();
  for (const trade of trades) {
    const day = byDate.get(trade.date) ?? { pnl: 0, trades: 0 };
    day.pnl += trade.pnl;
    day.trades += 1;
    byDate.set(trade.date, day);
  }

  const first = `${month}-01`;
  const leadingDays = (weekdayOfIso(first) + 6) % 7;
  const weekCount = Math.ceil((leadingDays + daysInMonth(month)) / 7);

  let cursor = addDaysToIso(first, -leadingDays);
  const weeks: CalendarWeek[] = [];

  for (let w = 0; w < weekCount; w++) {
    const days: CalendarDay[] = [];
    let weekPnl = 0;
    let weekTrades = 0;

    for (let d = 0; d < 7; d++) {
      const totals = byDate.get(cursor);
      const inMonth = cursor.startsWith(month);
      const pnl = toCents(totals?.pnl ?? 0);
      const count = totals?.trades ?? 0;
      days.push({ date: cursor, inMonth, pnl, trades: count });
      if (inMonth) {
        weekPnl += pnl;
        weekTrades += count;
      }
      cursor = addDaysToIso(cursor, 1);
    }

    weeks.push({ days, pnl: toCents(weekPnl), trades: weekTrades });
  }

  return weeks;
}

export function summarizeMonth(weeks: CalendarWeek[]): MonthSummary {
  const summary: MonthSummary = {
    pnl: 0,
    trades: 0,
    tradingDays: 0,
    greenDays: 0,
    redDays: 0,
    maxAbsDay: 0,
  };

  for (const week of weeks) {
    for (const day of week.days) {
      if (!day.inMonth || day.trades === 0) continue;
      summary.pnl += day.pnl;
      summary.trades += day.trades;
      summary.tradingDays += 1;
      if (day.pnl > 0) summary.greenDays += 1;
      if (day.pnl < 0) summary.redDays += 1;
      summary.maxAbsDay = Math.max(summary.maxAbsDay, Math.abs(day.pnl));
    }
  }

  summary.pnl = toCents(summary.pnl);
  return summary;
}