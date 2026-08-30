import { describe, it, expect } from "vitest";
import type { User } from "@supabase/supabase-js";
import { getDisplayName, getTimeOfDayGreeting } from "./greeting";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
    email: "rasheed@example.com",
    ...overrides,
  } as User;
}

describe("getDisplayName", () => {
  it("returns an empty string for no user", () => {
    expect(getDisplayName(null)).toBe("");
  });

  it("prefers the Google full_name metadata, first word only", () => {
    const user = makeUser({ user_metadata: { full_name: "Rasheed Adebayo" } });
    expect(getDisplayName(user)).toBe("Rasheed");
  });

  it("falls back to the email's local part when no metadata name exists", () => {
    const user = makeUser({ email: "rasheed@example.com", user_metadata: {} });
    expect(getDisplayName(user)).toBe("rasheed");
  });
});

describe("getTimeOfDayGreeting", () => {
  it("returns Good morning before noon", () => {
    expect(getTimeOfDayGreeting(new Date(2026, 0, 1, 9))).toBe("Good morning");
  });

  it("returns Good afternoon mid-day", () => {
    expect(getTimeOfDayGreeting(new Date(2026, 0, 1, 14))).toBe(
      "Good afternoon",
    );
  });

  it("returns Good evening in the evening", () => {
    expect(getTimeOfDayGreeting(new Date(2026, 0, 1, 19))).toBe(
      "Good evening",
    );
  });

  it("returns Good night late at night / early morning", () => {
    expect(getTimeOfDayGreeting(new Date(2026, 0, 1, 2))).toBe("Good night");
  });
});