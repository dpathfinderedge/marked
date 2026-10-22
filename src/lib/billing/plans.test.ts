import { describe, expect, it } from "vitest";
import {
  ANNUAL_DISCOUNT_PERCENT,
  ANNUAL_PER_MONTH_NGN,
  ANNUAL_PRICE_NGN,
  ANNUAL_SAVINGS_NGN,
  MONTHLY_PRICE_NGN,
  formatNaira,
  getPlanInterval,
  intervalLabel,
  intervalUnit,
  priceNgn,
  toKobo,
} from "./plans";

describe("pricing", () => {
  it("monthly is ₦12,000", () => {
    expect(MONTHLY_PRICE_NGN).toBe(12_000);
  });

  it("yearly is 35% off twelve months: ₦93,600", () => {
    expect(ANNUAL_DISCOUNT_PERCENT).toBe(35);
    expect(ANNUAL_PRICE_NGN).toBe(93_600);
  });

  it("works out the saving and the per-month equivalent", () => {
    expect(ANNUAL_SAVINGS_NGN).toBe(50_400);
    expect(ANNUAL_PER_MONTH_NGN).toBe(7_800);
    expect(ANNUAL_PRICE_NGN + ANNUAL_SAVINGS_NGN).toBe(MONTHLY_PRICE_NGN * 12);
  });

  it("priceNgn picks the right price", () => {
    expect(priceNgn("monthly")).toBe(12_000);
    expect(priceNgn("annual")).toBe(93_600);
  });

  it("converts to kobo the way Paystack expects", () => {
    expect(toKobo(12_000)).toBe(1_200_000);
    expect(toKobo(93_600)).toBe(9_360_000);
    expect(toKobo(priceNgn("monthly"))).toBe(1_200_000);
  });
});

describe("formatting", () => {
  it("formats naira with thousands separators", () => {
    expect(formatNaira(12_000)).toBe("₦12,000");
    expect(formatNaira(93_600)).toBe("₦93,600");
    expect(formatNaira(7_800)).toBe("₦7,800");
    expect(formatNaira(0)).toBe("₦0");
  });

  it("labels intervals", () => {
    expect(intervalLabel("monthly")).toBe("Monthly");
    expect(intervalLabel("annual")).toBe("Yearly");
    expect(intervalUnit("monthly")).toBe("month");
    expect(intervalUnit("annual")).toBe("year");
  });
});

describe("getPlanInterval", () => {
  const codes = { monthly: "PLN_month", annual: "PLN_year" };

  it("recognises each of our plans", () => {
    expect(getPlanInterval("PLN_month", codes)).toBe("monthly");
    expect(getPlanInterval("PLN_year", codes)).toBe("annual");
  });

  it("returns null for unknown, empty or missing codes", () => {
    expect(getPlanInterval("PLN_other", codes)).toBeNull();
    expect(getPlanInterval("", codes)).toBeNull();
    expect(getPlanInterval(null, codes)).toBeNull();
    expect(getPlanInterval(undefined, codes)).toBeNull();
  });

  it("returns null for the old JSON-blob plan_code rather than guessing", () => {
    const legacy =
      '{"id":4134942,"name":"Marked Pro","plan_code":"PLN_month","interval":"monthly"}';
    expect(getPlanInterval(legacy, codes)).toBeNull();
  });

  it("does not match anything when a code is not configured", () => {
    expect(getPlanInterval("PLN_year", { monthly: "PLN_month" })).toBeNull();
    expect(getPlanInterval("undefined", {})).toBeNull();
  });
});