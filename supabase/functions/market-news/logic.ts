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

const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD",
  EU: "EUR",
  EZ: "EUR",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  GB: "GBP",
  UK: "GBP",
  JP: "JPY",
  AU: "AUD",
  NZ: "NZD",
  CA: "CAD",
  CH: "CHF",
  CN: "CNY",
};

const CURRENCY_CODE = /^[A-Z]{3}$/;

export function currencyForCountry(country: string): string | null {
  return COUNTRY_CURRENCY[country.trim().toUpperCase()] ?? null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function withUnit(value: unknown, unit: string | null): string | null {
  const text = asText(value);
  if (text === null) return null;
  if (unit === null || text.endsWith(unit)) return text;
  return `${text}${unit}`;
}

function toImpact(value: unknown): Impact | null {
  const text = asText(value)?.toLowerCase();
  if (text === "high" || text === "medium" || text === "low") return text;
  return null;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

export function resolveEventTime(
  dateValue: unknown,
  timeValue: unknown,
): { date: string; time: string | null } | null {
  const time = asText(timeValue);
  const date = asText(dateValue);

  if (time !== null && time.includes("T")) {
    const ms = Date.parse(time);
    if (!Number.isNaN(ms)) {
      const iso = new Date(ms).toISOString();
      return { date: iso.slice(0, 10), time: iso };
    }
  }

  if (date !== null && date.includes("T")) {
    const ms = Date.parse(date);
    if (!Number.isNaN(ms)) {
      const iso = new Date(ms).toISOString();
      return { date: iso.slice(0, 10), time: iso };
    }
  }

  if (date !== null && ISO_DAY.test(date)) {
    const clock = time === null ? null : CLOCK.exec(time);
    if (clock) {
      const hours = clock[1]!.padStart(2, "0");
      return { date, time: `${date}T${hours}:${clock[2]}:00.000Z` };
    }
    return { date, time: null };
  }

  return null;
}

export function parseCalendar(raw: unknown): CalendarEvent[] {
  const root = asRecord(raw);
  const list = Array.isArray(raw) ? raw : root?.events;
  if (!Array.isArray(list)) return [];

  const events: CalendarEvent[] = [];
  for (const entry of list) {
    const row = asRecord(entry);
    if (!row) continue;

    const title = asText(row.name) ?? asText(row.title);
    const impact = toImpact(row.impact);
    const when = resolveEventTime(row.date, row.time_utc ?? row.time);
    if (title === null || impact === null || when === null) continue;

    const country = (asText(row.country) ?? "").toUpperCase();
    const givenCurrency = asText(row.currency)?.toUpperCase() ?? null;
    const currency =
      givenCurrency !== null && CURRENCY_CODE.test(givenCurrency)
        ? givenCurrency
        : currencyForCountry(country);

    const unit = asText(row.unit);
    events.push({
      id: asText(row.id) ?? `${country}-${title}-${when.date}`,
      title,
      country,
      currency,
      impact,
      date: when.date,
      time: when.time,
      forecast: withUnit(row.consensus ?? row.forecast, unit),
      previous: withUnit(row.prior ?? row.previous, unit),
      actual: withUnit(row.actual, unit),
    });
  }

  return sortEvents(dedupeEvents(events));
}

function dedupeEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.time === b.time) return a.title.localeCompare(b.title);
    if (a.time === null) return -1;
    if (b.time === null) return 1;
    return a.time < b.time ? -1 : 1;
  });
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      try {
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

function cleanText(raw: string): string {
  const withoutCdata = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const withoutTags = decodeEntities(withoutCdata).replace(/<[^>]+>/g, " ");
  return withoutTags.replace(/\s+/g, " ").trim();
}

function tagText(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  if (!match) return null;
  const text = cleanText(match[1] ?? "");
  return text === "" ? null : text;
}

function linkOf(block: string): string | null {
  const plain = tagText(block, "link");
  if (plain) return plain;
  const tags = block.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = /\brel=["']([^"']+)["']/i.exec(tag)?.[1];
    if (rel && rel !== "alternate") continue;
    const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1];
    if (href) return decodeEntities(href).trim();
  }
  return null;
}

function isWebUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export function parseFeed(xml: string, source: string, limit = 15): Headline[] {
  const blocks =
    xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];

  const headlines: Headline[] = [];
  for (const block of blocks) {
    const title = tagText(block, "title");
    const url = linkOf(block);
    const published =
      tagText(block, "pubDate") ?? tagText(block, "published") ?? tagText(block, "updated");
    if (title === null || url === null || published === null) continue;
    if (!isWebUrl(url)) continue;

    const ms = Date.parse(published);
    if (Number.isNaN(ms)) continue;

    headlines.push({
      id: url,
      title,
      url,
      source,
      publishedAt: new Date(ms).toISOString(),
    });
    if (headlines.length >= limit) break;
  }
  return headlines;
}

function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function mergeHeadlines(
  lists: Headline[][],
  now: Date,
  options: { limit?: number; maxAgeDays?: number } = {},
): Headline[] {
  const { limit = 40, maxAgeDays = 7 } = options;
  const oldest = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
  const newest = now.getTime() + 10 * 60 * 1000;

  const all = lists
    .flat()
    .filter((h) => {
      const ms = Date.parse(h.publishedAt);
      return ms >= oldest && ms <= newest;
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const merged: Headline[] = [];
  for (const headline of all) {
    const key = titleKey(headline.title);
    if (seenUrls.has(headline.url) || seenTitles.has(key)) continue;
    seenUrls.add(headline.url);
    seenTitles.add(key);
    merged.push(headline);
    if (merged.length >= limit) break;
  }
  return merged;
}