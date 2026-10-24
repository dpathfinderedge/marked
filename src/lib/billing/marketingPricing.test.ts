import { describe, expect, it } from "vitest";
import { FREE_TRADE_LIMIT } from "@/lib/calculations";
import * as app from "./plans";
import * as site from "../../../marketing/src/lib/pricing";

describe("marketing site pricing matches the app", () => {
  it("uses the same prices and discount", () => {
    expect(site.MONTHLY_PRICE_NGN).toBe(app.MONTHLY_PRICE_NGN);
    expect(site.ANNUAL_DISCOUNT_PERCENT).toBe(app.ANNUAL_DISCOUNT_PERCENT);
    expect(site.ANNUAL_PRICE_NGN).toBe(app.ANNUAL_PRICE_NGN);
    expect(site.ANNUAL_SAVINGS_NGN).toBe(app.ANNUAL_SAVINGS_NGN);
    expect(site.ANNUAL_PER_MONTH_NGN).toBe(app.ANNUAL_PER_MONTH_NGN);
  });

  it("uses the same free-plan limit", () => {
    expect(site.FREE_TRADE_LIMIT).toBe(FREE_TRADE_LIMIT);
  });

  it("formats money the same way", () => {
    for (const amount of [0, 7_800, 12_000, 93_600]) {
      expect(site.formatNaira(amount)).toBe(app.formatNaira(amount));
    }
  });
});