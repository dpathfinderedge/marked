import { describe, it, expect } from "vitest";
import { toIsoDate, startOfWeek, getWeekDates } from "./dates";

describe("toIsoDate", () => {
  it("formats using local date components, not UTC", () => {
    const date = new Date(2026, 7, 5); // Aug 5, 2026 local time
    expect(toIsoDate(date)).toBe("2026-08-05");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 0, 3); // Jan 3
    expect(toIsoDate(date)).toBe("2026-01-03");
  });
});

describe("startOfWeek", () => {
  it("returns the Sunday of the given week", () => {
    const wednesday = new Date(2026, 7, 5);
    const sunday = startOfWeek(wednesday);
    expect(sunday.getDay()).toBe(0);
    expect(toIsoDate(sunday)).toBe("2026-08-02");
  });
});

describe("getWeekDates", () => {
  it("returns 7 consecutive dates starting on Sunday", () => {
    const wednesday = new Date(2026, 7, 5);
    const week = getWeekDates(wednesday);
    expect(week).toHaveLength(7);
    expect(week.map((d) => toIsoDate(d))).toEqual([
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
    ]);
  });
});