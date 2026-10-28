import { describe, expect, it, vi } from "vitest";
import { handleNews, type CacheEntry, type NewsKind } from "./handler.ts";

const NOW = new Date("2026-10-27T12:00:00.000Z");

const CALENDAR_BODY = JSON.stringify({
  events: [
    {
      id: "e1",
      name: "CPI",
      country: "US",
      impact: "high",
      date: "2026-10-28",
      time_utc: "12:30",
      consensus: "3.1",
      prior: "3.0",
      actual: null,
      unit: "%",
    },
  ],
});

const RSS = (title: string, url: string) => `<rss><channel><item>
  <title>${title}</title><link>${url}</link>
  <pubDate>Tue, 27 Oct 2026 11:00:00 GMT</pubDate></item></channel></rss>`;

function respond(body: string, status = 200): Response {
  return new Response(body, { status });
}

function setup(
  route: (url: string) => Response | Promise<Response>,
  options: { cache?: Map<NewsKind, CacheEntry>; now?: Date } = {},
) {
  const fetchFn = vi.fn((input: RequestInfo | URL) => Promise.resolve(route(String(input))));
  const cache = options.cache ?? new Map<NewsKind, CacheEntry>();
  const now = options.now ?? NOW;
  const call = (init: RequestInit & { url?: string } = {}) =>
    handleNews(
      new Request(init.url ?? "https://fn.test/market-news", { method: "POST", ...init }),
      { fetch: fetchFn as unknown as typeof fetch, cache, now: () => now },
    );
  return { call, fetchFn, cache };
}

const post = (kind: unknown) => ({ body: JSON.stringify({ kind }) });

describe("handleNews", () => {
  it("answers preflight requests", async () => {
    const { call } = setup(() => respond(""));
    const res = await call({ method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("rejects unknown kinds and methods", async () => {
    const { call } = setup(() => respond(""));
    expect((await call(post("weather"))).status).toBe(400);
    expect((await call({ body: "not json" })).status).toBe(400);
    expect((await call({ method: "DELETE" })).status).toBe(405);
  });

  it("returns the calendar, tidied up", async () => {
    const { call } = setup(() => respond(CALENDAR_BODY));
    const res = await call(post("calendar"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.stale).toBe(false);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      title: "CPI",
      currency: "USD",
      forecast: "3.1%",
      time: "2026-10-28T12:30:00.000Z",
    });
  });

  it("reads the kind from the query string too", async () => {
    const { call } = setup(() => respond(CALENDAR_BODY));
    const res = await call({
      method: "GET",
      url: "https://fn.test/market-news?kind=calendar",
    });
    expect(res.status).toBe(200);
  });

  it("serves from the cache until it expires", async () => {
    const cache = new Map<NewsKind, CacheEntry>();
    const first = setup(() => respond(CALENDAR_BODY), { cache });
    await first.call(post("calendar"));
    expect(first.fetchFn).toHaveBeenCalledTimes(2); 

    const soon = setup(() => respond("should not be asked"), {
      cache,
      now: new Date(NOW.getTime() + 5 * 60 * 1000),
    });
    const res = await soon.call(post("calendar"));
    expect((await res.json()).items).toHaveLength(1);
    expect(soon.fetchFn).not.toHaveBeenCalled();

    const later = setup(() => respond(CALENDAR_BODY), {
      cache,
      now: new Date(NOW.getTime() + 20 * 60 * 1000),
    });
    await later.call(post("calendar"));
    expect(later.fetchFn).toHaveBeenCalledTimes(2);
  });

  it("still shows one week when the other fails", async () => {
    let n = 0;
    const { call } = setup(() => (n++ === 0 ? respond(CALENDAR_BODY) : respond("down", 503)));
    const res = await call(post("calendar"));
    expect(res.status).toBe(200);
    expect((await res.json()).items).toHaveLength(1);
  });

  it("serves the old copy, marked stale, when the source goes down", async () => {
    const cache = new Map<NewsKind, CacheEntry>();
    await setup(() => respond(CALENDAR_BODY), { cache }).call(post("calendar"));

    const down = setup(() => respond("down", 503), {
      cache,
      now: new Date(NOW.getTime() + 60 * 60 * 1000),
    });
    const res = await down.call(post("calendar"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.stale).toBe(true);
    expect(body.items).toHaveLength(1);
  });

  it("explains itself when the source is down and nothing is saved", async () => {
    const { call } = setup(() => respond("down", 503));
    const res = await call(post("calendar"));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/calendar is unavailable/i);
  });

  it("treats a source that returns junk as down", async () => {
    const { call } = setup(() => respond("<html>maintenance</html>"));
    expect((await call(post("calendar"))).status).toBe(502);
  });

  it("merges headlines from every feed that works", async () => {
    const { call } = setup((url) => {
      if (url.includes("fxstreet")) return respond(RSS("Yen weakens", "https://fx.test/1"));
      if (url.includes("coindesk")) return respond("down", 500);
      return respond(RSS("Bitcoin rallies", "https://ct.test/2"));
    });
    const res = await call(post("headlines"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.items.map((h: { source: string }) => h.source).sort()).toEqual([
      "Cointelegraph",
      "FXStreet",
    ]);
  });

  it("returns an error only when every feed fails", async () => {
    const { call } = setup(() => respond("down", 500));
    const res = await call(post("headlines"));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/headlines/i);
  });
});