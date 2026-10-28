import { describe, expect, it } from "vitest";
import {
  filterEvents,
  findNextEvent,
  formatAge,
  formatDayHeading,
  groupEventsByDay,
  hasHappened,
  parseCalendarPayload,
  parseHeadlinesPayload,
  type CalendarEvent,
} from "./news";

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "e",
    title: "Event",
    country: "US",
    currency: "USD",
    impact: "high",
    date: "2026-10-28",
    time: "2026-10-28T12:30:00.000Z",
    forecast: null,
    previous: null,
    actual: null,
    ...overrides,
  };
}

describe("filterEvents", () => {
  const list = [
    event({ id: "1", impact: "high", currency: "USD" }),
    event({ id: "2", impact: "medium", currency: "EUR" }),
    event({ id: "3", impact: "low", currency: "GBP" }),
    event({ id: "4", impact: "high", currency: null }),
  ];

  it("filters by impact", () => {
    expect(filterEvents(list, "high", []).map((e) => e.id)).toEqual(["1", "4"]);
    expect(filterEvents(list, "medium", []).map((e) => e.id)).toEqual(["1", "2", "4"]);
    expect(filterEvents(list, "all", []).map((e) => e.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("filters by currency, hiding events with an unknown currency", () => {
    expect(filterEvents(list, "all", ["EUR", "GBP"]).map((e) => e.id)).toEqual(["2", "3"]);
  });
});

describe("groupEventsByDay and time", () => {
  it("groups by the viewer's day and puts untimed events first", () => {
    const a = event({ id: "a", time: "2026-10-28T15:00:00.000Z" });
    const b = event({ id: "b", time: "2026-10-28T09:00:00.000Z" });
    const c = event({ id: "c", time: null, date: "2026-10-28" });
    const d = event({ id: "d", time: "2026-10-29T09:00:00.000Z", date: "2026-10-29" });
    const days = groupEventsByDay([a, d, b, c]);
    expect(days).toHaveLength(2);
    expect(days[0]!.events.map((e) => e.id)).toEqual(["c", "b", "a"]);
    expect(days[1]!.events.map((e) => e.id)).toEqual(["d"]);
  });
});

describe("findNextEvent and hasHappened", () => {
  const early = event({ id: "early", time: "2026-10-28T08:00:00.000Z" });
  const late = event({ id: "late", time: "2026-10-28T15:00:00.000Z" });
  const now = new Date("2026-10-28T10:00:00.000Z");

  it("finds the first event still to come", () => {
    expect(findNextEvent([late, early], now)?.id).toBe("late");
    expect(findNextEvent([early], now)).toBeNull();
  });

  it("knows what has happened", () => {
    expect(hasHappened(early, now)).toBe(true);
    expect(hasHappened(late, now)).toBe(false);
  });
});

describe("payload parsing", () => {
  it("keeps good events and drops bad ones", () => {
    const payload = parseCalendarPayload({
      kind: "calendar",
      fetchedAt: "2026-10-27T12:00:00.000Z",
      stale: true,
      items: [event({ id: "ok" }), { id: "x" }, null, { ...event({}), impact: "huge" }],
    });
    expect(payload?.items.map((e) => e.id)).toEqual(["ok"]);
    expect(payload?.stale).toBe(true);
  });

  it("rejects the wrong shape", () => {
    expect(parseCalendarPayload(null)).toBeNull();
    expect(parseCalendarPayload({ items: [] })).toBeNull();
    expect(parseHeadlinesPayload("nope")).toBeNull();
  });

  it("only accepts web links in headlines", () => {
    const good = {
      id: "1",
      title: "Gold up",
      url: "https://example.com/a",
      source: "Wire",
      publishedAt: "2026-10-27T10:00:00.000Z",
    };
    const payload = parseHeadlinesPayload({
      fetchedAt: "2026-10-27T12:00:00.000Z",
      items: [good, { ...good, id: "2", url: "javascript:alert(1)" }],
    });
    expect(payload?.items.map((h) => h.id)).toEqual(["1"]);
    expect(payload?.stale).toBe(false);
  });
});

describe("wording", () => {
  const now = new Date(2026, 9, 28, 12, 0, 0);

  it("labels nearby days", () => {
    expect(formatDayHeading("2026-10-28", now)).toMatch(/^Today · /);
    expect(formatDayHeading("2026-10-29", now)).toMatch(/^Tomorrow · /);
    expect(formatDayHeading("2026-10-27", now)).toMatch(/^Yesterday · /);
    expect(formatDayHeading("2026-11-03", now)).not.toMatch(/·/);
  });

  it("describes how old a headline is", () => {
    const base = new Date("2026-10-27T12:00:00.000Z");
    expect(formatAge("2026-10-27T11:59:40.000Z", base)).toBe("Just now");
    expect(formatAge("2026-10-27T11:30:00.000Z", base)).toBe("30 min ago");
    expect(formatAge("2026-10-27T09:00:00.000Z", base)).toBe("3 h ago");
    expect(formatAge("2026-10-23T12:00:00.000Z", base)).toBe("4 d ago");
  });
});