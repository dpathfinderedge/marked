import {
  mergeHeadlines,
  parseCalendar,
  parseFeed,
  type CalendarEvent,
  type Headline,
} from "./logic.ts";

export type NewsKind = "calendar" | "headlines";

export const CALENDAR_URLS = [
  "https://www.financecalendar.com/wp-json/fc/v1/week",
  "https://www.financecalendar.com/wp-json/fc/v1/week?which=next",
];

export const HEADLINE_FEEDS: { name: string; url: string }[] = [
  { name: "FXStreet", url: "https://www.fxstreet.com/rss/news" },
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
];

const TTL_MS: Record<NewsKind, number> = {
  calendar: 15 * 60 * 1000,
  headlines: 5 * 60 * 1000,
};

const FETCH_TIMEOUT_MS = 8000;

export interface CacheEntry {
  at: number;
  items: CalendarEvent[] | Headline[];
}

export interface NewsDeps {
  fetch: typeof fetch;
  cache: Map<NewsKind, CacheEntry>;
  now?: () => Date;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extra },
  });
}

async function getText(deps: NewsDeps, url: string): Promise<string> {
  const response = await deps.fetch(url, {
    headers: { Accept: "application/json, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return await response.text();
}

async function loadCalendar(deps: NewsDeps): Promise<CalendarEvent[]> {
  const results = await Promise.allSettled(
    CALENDAR_URLS.map(async (url) => parseCalendar(JSON.parse(await getText(deps, url)))),
  );
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<CalendarEvent[]> => r.status === "fulfilled",
  );
  if (fulfilled.length === 0) throw new Error("calendar source unavailable");

  const byId = new Map<string, CalendarEvent>();
  for (const result of fulfilled) {
    for (const event of result.value) byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) =>
    a.date === b.date
      ? (a.time ?? "").localeCompare(b.time ?? "")
      : a.date < b.date
        ? -1
        : 1,
  );
}

async function loadHeadlines(deps: NewsDeps, now: Date): Promise<Headline[]> {
  const results = await Promise.allSettled(
    HEADLINE_FEEDS.map(async (feed) => parseFeed(await getText(deps, feed.url), feed.name)),
  );
  const lists = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (lists.length === 0) throw new Error("no headline feed available");
  return mergeHeadlines(lists, now);
}

function readKind(req: Request, body: unknown): string | null {
  const fromQuery = new URL(req.url).searchParams.get("kind");
  if (fromQuery) return fromQuery;
  if (typeof body === "object" && body !== null && "kind" in body) {
    const kind = (body as { kind: unknown }).kind;
    return typeof kind === "string" ? kind : null;
  }
  return null;
}

export async function handleNews(req: Request, deps: NewsDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  let body: unknown = null;
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      body = null;
    }
  }

  const kind = readKind(req, body);
  if (kind !== "calendar" && kind !== "headlines") {
    return json({ error: "Ask for the calendar or the headlines." }, 400);
  }

  const now = (deps.now ?? (() => new Date()))();
  const cached = deps.cache.get(kind);

  if (cached && now.getTime() - cached.at < TTL_MS[kind]) {
    return json(
      { kind, items: cached.items, fetchedAt: new Date(cached.at).toISOString(), stale: false },
      200,
      { "Cache-Control": "public, max-age=60" },
    );
  }

  try {
    const items = kind === "calendar" ? await loadCalendar(deps) : await loadHeadlines(deps, now);
    deps.cache.set(kind, { at: now.getTime(), items });
    return json({ kind, items, fetchedAt: now.toISOString(), stale: false }, 200, {
      "Cache-Control": "public, max-age=60",
    });
  } catch {
    if (cached) {
      return json({
        kind,
        items: cached.items,
        fetchedAt: new Date(cached.at).toISOString(),
        stale: true,
      });
    }
    return json(
      {
        error:
          kind === "calendar"
            ? "The economic calendar is unavailable right now. Try again in a few minutes."
            : "Headlines are unavailable right now. Try again in a few minutes.",
      },
      502,
    );
  }
}