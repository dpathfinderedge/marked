import { toIsoDate } from "@/utils/dates";

export type Impact = "high" | "medium" | "low";

export interface CalendarEvent {
  id: string;
  title: string;
  country: string;
  currency: string | null;
  impact: Impact;
  date: string;
  time: string | null;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
}

export interface Headline {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

export type ImpactFilter = "high" | "medium" | "all";

export const IMPACT_FILTERS: { value: ImpactFilter; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium+" },
  { value: "all", label: "All" },
];

export const NEWS_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"] as const;

const IMPACT_RANK: Record<Impact, number> = { low: 1, medium: 2, high: 3 };
const FILTER_MIN_RANK: Record<ImpactFilter, number> = { all: 1, medium: 2, high: 3 };

export function impactRank(impact: Impact): number {
  return IMPACT_RANK[impact];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isText = (v: unknown): v is string => typeof v === "string" && v !== "";
const textOrNull = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

function toEvent(value: unknown): CalendarEvent | null {
  if (!isRecord(value)) return null;
  const { impact } = value;
  if (impact !== "high" && impact !== "medium" && impact !== "low") return null;
  if (!isText(value.id) || !isText(value.title) || !isText(value.date)) return null;
  return {
    id: value.id,
    title: value.title,
    country: typeof value.country === "string" ? value.country : "",
    currency: textOrNull(value.currency),
    impact,
    date: value.date,
    time: textOrNull(value.time),
    forecast: textOrNull(value.forecast),
    previous: textOrNull(value.previous),
    actual: textOrNull(value.actual),
  };
}

function toHeadline(value: unknown): Headline | null {
  if (!isRecord(value)) return null;
  if (
    !isText(value.id) ||
    !isText(value.title) ||
    !isText(value.url) ||
    !isText(value.source) ||
    !isText(value.publishedAt)
  ) {
    return null;
  }
  if (!/^https?:\/\//i.test(value.url)) return null;
  return {
    id: value.id,
    title: value.title,
    url: value.url,
    source: value.source,
    publishedAt: value.publishedAt,
  };
}

export interface NewsPayload<T> {
  items: T[];
  fetchedAt: string;
  stale: boolean;
}

function parsePayload<T>(raw: unknown, convert: (v: unknown) => T | null): NewsPayload<T> | null {
  if (!isRecord(raw) || !Array.isArray(raw.items) || !isText(raw.fetchedAt)) return null;
  const items: T[] = [];
  for (const entry of raw.items) {
    const item = convert(entry);
    if (item) items.push(item);
  }
  return { items, fetchedAt: raw.fetchedAt, stale: raw.stale === true };
}

export const parseCalendarPayload = (raw: unknown): NewsPayload<CalendarEvent> | null =>
  parsePayload(raw, toEvent);

export const parseHeadlinesPayload = (raw: unknown): NewsPayload<Headline> | null =>
  parsePayload(raw, toHeadline);

export function filterEvents(
  events: CalendarEvent[],
  impact: ImpactFilter,
  currencies: readonly string[],
): CalendarEvent[] {
  const minRank = FILTER_MIN_RANK[impact];
  return events.filter((event) => {
    if (impactRank(event.impact) < minRank) return false;
    if (currencies.length === 0) return true;
    return event.currency !== null && currencies.includes(event.currency);
  });
}

export function localDayOf(event: CalendarEvent): string {
  return event.time === null ? event.date : toIsoDate(new Date(event.time));
}

export interface EventDay {
  day: string;
  events: CalendarEvent[];
}

export function groupEventsByDay(events: CalendarEvent[]): EventDay[] {
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const day = localDayOf(event);
    const list = byDay.get(day);
    if (list) list.push(event);
    else byDay.set(day, [event]);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, list]) => ({
      day,
      events: [...list].sort((a, b) => {
        if (a.time === b.time) return a.title.localeCompare(b.title);
        if (a.time === null) return -1;
        if (b.time === null) return 1;
        return a.time < b.time ? -1 : 1;
      }),
    }));
}

export function findNextEvent(events: CalendarEvent[], now: Date): CalendarEvent | null {
  const nowMs = now.getTime();
  const today = toIsoDate(now);
  for (const event of [...events].sort(compareByWhen)) {
    if (event.time !== null) {
      if (Date.parse(event.time) > nowMs) return event;
    } else if (localDayOf(event) > today) {
      return event;
    }
  }
  return null;
}

function compareByWhen(a: CalendarEvent, b: CalendarEvent): number {
  const aKey = a.time ?? `${a.date}T23:59:59.999Z`;
  const bKey = b.time ?? `${b.date}T23:59:59.999Z`;
  return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
}

export function hasHappened(event: CalendarEvent, now: Date): boolean {
  if (event.time !== null) return Date.parse(event.time) <= now.getTime();
  return localDayOf(event) < toIsoDate(now);
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.time === null) return "Tentative";
  return new Date(event.time).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDayHeading(day: string, now: Date): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((date.getTime() - todayStart.getTime()) / 86_400_000);
  const label = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  if (diff === 0) return `Today · ${label}`;
  if (diff === 1) return `Tomorrow · ${label}`;
  if (diff === -1) return `Yesterday · ${label}`;
  return label;
}

export function formatAge(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}