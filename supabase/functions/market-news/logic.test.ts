import { describe, expect, it } from "vitest";
import {
  currencyForCountry,
  decodeEntities,
  mergeHeadlines,
  parseCalendar,
  parseFeed,
  resolveEventTime,
  type Headline,
} from "./logic.ts";

describe("currencyForCountry", () => {
  it("maps country codes to currencies", () => {
    expect(currencyForCountry("us")).toBe("USD");
    expect(currencyForCountry("GB")).toBe("GBP");
    expect(currencyForCountry("DE")).toBe("EUR");
    expect(currencyForCountry("BR")).toBeNull();
  });
});

describe("resolveEventTime", () => {
  it("combines a day and a clock time as UTC", () => {
    expect(resolveEventTime("2026-10-28", "12:30")).toEqual({
      date: "2026-10-28",
      time: "2026-10-28T12:30:00.000Z",
    });
    expect(resolveEventTime("2026-10-28", "9:05:00")?.time).toBe("2026-10-28T09:05:00.000Z");
  });

  it("accepts a full timestamp", () => {
    expect(resolveEventTime("2026-10-28", "2026-10-28T13:30:00+01:00")).toEqual({
      date: "2026-10-28",
      time: "2026-10-28T12:30:00.000Z",
    });
    expect(resolveEventTime("2026-10-28T12:30:00Z", null)?.time).toBe("2026-10-28T12:30:00.000Z");
  });

  it("keeps the day when there is no time", () => {
    expect(resolveEventTime("2026-10-28", null)).toEqual({ date: "2026-10-28", time: null });
    expect(resolveEventTime("2026-10-28", "All day")).toEqual({ date: "2026-10-28", time: null });
  });

  it("gives up on nonsense", () => {
    expect(resolveEventTime(null, "12:30")).toBeNull();
    expect(resolveEventTime("soon", null)).toBeNull();
  });
});

describe("parseCalendar", () => {
  const event = {
    id: "e1",
    name: "Non-Farm Payrolls",
    country: "US",
    impact: "high",
    date: "2026-11-06",
    time_utc: "13:30",
    consensus: 180,
    prior: "150",
    actual: null,
    unit: "K",
  };

  it("reads events from an envelope", () => {
    const [first] = parseCalendar({ events: [event] });
    expect(first).toEqual({
      id: "e1",
      title: "Non-Farm Payrolls",
      country: "US",
      currency: "USD",
      impact: "high",
      date: "2026-11-06",
      time: "2026-11-06T13:30:00.000Z",
      forecast: "180K",
      previous: "150K",
      actual: null,
    });
  });

  it("also accepts a bare array and prefers a currency the source gives", () => {
    const [first] = parseCalendar([{ ...event, country: "EU", currency: "eur" }]);
    expect(first?.currency).toBe("EUR");
  });

  it("does not double up a unit that's already there", () => {
    const [first] = parseCalendar([{ ...event, unit: "%", consensus: "2.5%", prior: 2.4 }]);
    expect(first?.forecast).toBe("2.5%");
    expect(first?.previous).toBe("2.4%");
  });

  it("drops rows it can't show", () => {
    const result = parseCalendar({
      events: [
        event,
        { ...event, id: "no-name", name: "" },
        { ...event, id: "bad-impact", impact: "huge" },
        { ...event, id: "no-date", date: null, time_utc: null },
        "not an object",
        null,
      ],
    });
    expect(result.map((e) => e.id)).toEqual(["e1"]);
  });

  it("removes repeated ids and sorts by time", () => {
    const later = { ...event, id: "e2", name: "B", time_utc: "15:00" };
    const earlier = { ...event, id: "e3", name: "A", time_utc: "08:00" };
    const untimed = { ...event, id: "e4", name: "C", time_utc: null };
    const result = parseCalendar({ events: [later, event, earlier, event, untimed] });
    expect(result.map((e) => e.id)).toEqual(["e4", "e3", "e1", "e2"]);
  });

  it("returns nothing for the wrong shape", () => {
    expect(parseCalendar(null)).toEqual([]);
    expect(parseCalendar({ events: "nope" })).toEqual([]);
    expect(parseCalendar("<html>")).toEqual([]);
  });
});

describe("decodeEntities", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("Fed &amp; ECB &#8211; &#x2019;s &quot;view&quot;")).toBe(
      "Fed & ECB – ’s \"view\"",
    );
  });

  it("leaves unknown entities alone", () => {
    expect(decodeEntities("&madeup; &#99999999999;")).toBe("&madeup; &#99999999999;");
  });
});

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Feed</title>
  <item>
    <title><![CDATA[Gold climbs as dollar slips &amp; yields fall]]></title>
    <link>https://example.com/gold</link>
    <pubDate>Tue, 27 Oct 2026 10:00:00 GMT</pubDate>
    <description>Long article text that we must not keep.</description>
  </item>
  <item>
    <title>Bitcoin &amp; ether rally</title>
    <link>https://example.com/btc</link>
    <pubDate>Tue, 27 Oct 2026 12:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Unsafe link</title>
    <link>javascript:alert(1)</link>
    <pubDate>Tue, 27 Oct 2026 12:00:00 GMT</pubDate>
  </item>
  <item>
    <title>No date</title>
    <link>https://example.com/nodate</link>
  </item>
</channel></rss>`;

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Yen weakens past 155</title>
    <link rel="alternate" href="https://example.com/yen?a=1&amp;b=2"/>
    <link rel="self" href="https://example.com/self"/>
    <updated>2026-10-27T09:30:00Z</updated>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("reads RSS items and cleans the titles", () => {
    const items = parseFeed(RSS, "Wire");
    expect(items.map((i) => i.title)).toEqual([
      "Gold climbs as dollar slips & yields fall",
      "Bitcoin & ether rally",
    ]);
    expect(items[0]).toEqual({
      id: "https://example.com/gold",
      title: "Gold climbs as dollar slips & yields fall",
      url: "https://example.com/gold",
      source: "Wire",
      publishedAt: "2026-10-27T10:00:00.000Z",
    });
    expect(JSON.stringify(items)).not.toContain("Long article text");
  });

  it("reads Atom entries and picks the alternate link", () => {
    const [item] = parseFeed(ATOM, "Atom Wire");
    expect(item?.url).toBe("https://example.com/yen?a=1&b=2");
    expect(item?.publishedAt).toBe("2026-10-27T09:30:00.000Z");
  });

  it("respects the limit and survives garbage", () => {
    expect(parseFeed(RSS, "Wire", 1)).toHaveLength(1);
    expect(parseFeed("<html>Not a feed</html>", "Wire")).toEqual([]);
    expect(parseFeed("", "Wire")).toEqual([]);
  });
});

describe("mergeHeadlines", () => {
  const NOW = new Date("2026-10-27T12:00:00Z");
  const make = (title: string, url: string, publishedAt: string, source = "A"): Headline => ({
    id: url,
    title,
    url,
    source,
    publishedAt,
  });

  it("sorts newest first and drops repeated stories", () => {
    const merged = mergeHeadlines(
      [
        [
          make("Gold rises", "https://a.com/1", "2026-10-27T09:00:00Z"),
          make("Oil falls", "https://a.com/2", "2026-10-27T11:00:00Z"),
        ],
        [
          make("GOLD rises!", "https://b.com/9", "2026-10-27T10:00:00Z", "B"),
          make("Yen slips", "https://b.com/3", "2026-10-27T08:00:00Z", "B"),
        ],
      ],
      NOW,
    );
    expect(merged.map((h) => h.title)).toEqual(["Oil falls", "GOLD rises!", "Yen slips"]);
  });

  it("drops old and future-dated items and applies the limit", () => {
    const merged = mergeHeadlines(
      [
        [
          make("Old", "https://a.com/old", "2026-10-01T00:00:00Z"),
          make("Future", "https://a.com/future", "2026-10-30T00:00:00Z"),
          make("One", "https://a.com/1", "2026-10-27T11:00:00Z"),
          make("Two", "https://a.com/2", "2026-10-27T10:00:00Z"),
        ],
      ],
      NOW,
      { limit: 1 },
    );
    expect(merged.map((h) => h.title)).toEqual(["One"]);
  });
});