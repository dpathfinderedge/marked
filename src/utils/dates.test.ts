import { describe, it, expect } from "vitest";
import {
  addDaysToIso,
  formatLongDate,
  formatShortDate,
  getWeekDates,
  startOfWeek,
  toIsoDate,
  weekdayOfIso,
} from "./dates";

describe("toIsoDate", () => {
  it("formats using local date components, not UTC", () => {
    const date = new Date(2026, 7, 5);
    expect(toIsoDate(date)).toBe("2026-08-05");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 0, 3); 
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

describe("calendar-date helpers", () => {
  it("adds days across month and year ends", () => {
    expect(addDaysToIso("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysToIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToIso("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysToIso("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("finds the weekday of a date", () => {
    expect(weekdayOfIso("2026-10-25")).toBe(0); 
    expect(weekdayOfIso("2026-10-26")).toBe(1);
  });

  it("formats dates without involving the time zone", () => {
    expect(formatShortDate("2026-10-05")).toBe("Oct 5");
    expect(formatLongDate("2026-01-31")).toBe("Jan 31, 2026");
  });
});