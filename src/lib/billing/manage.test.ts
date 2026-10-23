import { describe, expect, it } from "vitest";
import {
  describeAmount,
  describeCard,
  formatDate,
  parseSubscriptionDetails,
} from "./manage";

describe("parseSubscriptionDetails", () => {
  const good = {
    status: "active",
    cancelAtPeriodEnd: false,
    planCode: "PLN_m",
    nextPaymentDate: "2026-11-20T00:00:00.000Z",
    card: { brand: "visa", last4: "4081", expMonth: "12", expYear: "2030" },
    payments: [
      { reference: "r1", amount: 1_200_000, currency: "NGN", paidAt: "2026-10-20T10:00:00.000Z" },
    ],
  };

  it("accepts a well-formed answer", () => {
    expect(parseSubscriptionDetails(good)).toEqual(good);
  });

  it("rejects anything that isn't an object with a known status", () => {
    for (const bad of [null, "x", 5, [], {}, { status: "weird" }]) {
      expect(parseSubscriptionDetails(bad)).toBeNull();
    }
  });

  it("drops malformed payments and cards instead of failing", () => {
    const result = parseSubscriptionDetails({
      ...good,
      card: { brand: "visa" },
      payments: [null, { reference: "ok", amount: 5 }, { reference: 1, amount: 5 }, { reference: "x", amount: "5" }],
    });
    expect(result?.card).toBeNull();
    expect(result?.payments).toEqual([
      { reference: "ok", amount: 5, currency: "NGN", paidAt: null },
    ]);
  });

  it("copes with missing optional parts", () => {
    expect(parseSubscriptionDetails({ status: "past_due" })).toEqual({
      status: "past_due",
      cancelAtPeriodEnd: false,
      planCode: null,
      nextPaymentDate: null,
      card: null,
      payments: [],
    });
  });
});

describe("formatting", () => {
  it("formats dates unambiguously", () => {
    expect(formatDate("2026-11-20T10:00:00.000Z", "UTC")).toBe("20 Nov 2026");
    expect(formatDate("not a date")).toBe("");
  });

  it("describes a card", () => {
    expect(describeCard({ brand: "visa", last4: "4081", expMonth: "2", expYear: "2030" })).toBe(
      "Visa ending 4081 · expires 02/2030",
    );
    expect(describeCard({ brand: "", last4: "1111", expMonth: "", expYear: "" })).toBe(
      "Card ending 1111",
    );
  });

  it("converts kobo to naira", () => {
    const base = { reference: "r", paidAt: null };
    expect(describeAmount({ ...base, amount: 1_200_000, currency: "NGN" })).toBe("₦12,000");
    expect(describeAmount({ ...base, amount: 9_360_000, currency: "NGN" })).toBe("₦93,600");
    expect(describeAmount({ ...base, amount: 2_500, currency: "USD" })).toBe("USD 25.00");
  });
});