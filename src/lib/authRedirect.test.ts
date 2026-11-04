import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, getReturnPath } from "@/lib/authRedirect";

describe("getReturnPath", () => {
  it("returns the page the visitor was bounced from", () => {
    expect(getReturnPath({ from: { pathname: "/billing" } })).toBe("/billing");
  });

  it("keeps the query string", () => {
    expect(
      getReturnPath({ from: { pathname: "/trades", search: "?pair=EURUSD" } }),
    ).toBe("/trades?pair=EURUSD");
  });

  it("falls back to the dashboard when there is no state", () => {
    expect(getReturnPath(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(getReturnPath(undefined)).toBe(DEFAULT_AFTER_LOGIN);
    expect(getReturnPath({})).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("never returns to the auth screens or the bare root", () => {
    expect(getReturnPath({ from: { pathname: "/auth" } })).toBe(DEFAULT_AFTER_LOGIN);
    expect(getReturnPath({ from: { pathname: "/auth/reset" } })).toBe(
      DEFAULT_AFTER_LOGIN,
    );
    expect(getReturnPath({ from: { pathname: "/" } })).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("rejects values that are not same-site paths", () => {
    expect(getReturnPath({ from: { pathname: "//evil.example" } })).toBe(
      DEFAULT_AFTER_LOGIN,
    );
    expect(getReturnPath({ from: { pathname: "https://evil.example" } })).toBe(
      DEFAULT_AFTER_LOGIN,
    );
    expect(getReturnPath({ from: { pathname: 42 } })).toBe(DEFAULT_AFTER_LOGIN);
  });
});