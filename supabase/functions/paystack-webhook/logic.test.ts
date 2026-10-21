import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildSubscriptionRow,
  extractSubscriptionCode,
  isStaleSubscriptionUpdate,
  mapPaystackStatus,
  parseAllowedPlanCodes,
  parseNextPaymentDate,
  parsePaystackSubscription,
  redactEventForStorage,
  sha256Hex,
  verifyPaystackSignature,
} from "./logic.ts";

describe("verifyPaystackSignature", () => {
  const secret = "sk_test_secret";
  const body = JSON.stringify({ event: "subscription.create", data: {} });
  const goodSignature = createHmac("sha512", secret).update(body).digest("hex");

  it("accepts a correct HMAC-SHA512 signature", async () => {
    expect(await verifyPaystackSignature(body, goodSignature, secret)).toBe(
      true,
    );
  });

  it("rejects a body that was changed after signing", async () => {
    expect(
      await verifyPaystackSignature(`${body} `, goodSignature, secret),
    ).toBe(false);
  });

  it("rejects a signature made with a different key", async () => {
    const forged = createHmac("sha512", "someone-else").update(body).digest("hex");
    expect(await verifyPaystackSignature(body, forged, secret)).toBe(false);
  });

  it("rejects garbage and empty signatures", async () => {
    expect(await verifyPaystackSignature(body, "nope", secret)).toBe(false);
    expect(await verifyPaystackSignature(body, "", secret)).toBe(false);
  });
});

describe("sha256Hex", () => {
  it("matches the standard test vector", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("mapPaystackStatus", () => {
  it.each([
    ["active", { status: "active", cancelAtPeriodEnd: false }],
    ["non-renewing", { status: "active", cancelAtPeriodEnd: true }],
    ["non_renewing", { status: "active", cancelAtPeriodEnd: true }],
    ["Non-Renewing", { status: "active", cancelAtPeriodEnd: true }],
    ["attention", { status: "past_due", cancelAtPeriodEnd: false }],
    ["completed", { status: "cancelled", cancelAtPeriodEnd: false }],
    ["cancelled", { status: "cancelled", cancelAtPeriodEnd: false }],
    ["canceled", { status: "cancelled", cancelAtPeriodEnd: false }],
  ])("maps %s", (raw, expected) => {
    expect(mapPaystackStatus(raw)).toEqual(expected);
  });

  it("returns null for anything unrecognised", () => {
    expect(mapPaystackStatus("paused")).toBeNull();
    expect(mapPaystackStatus("")).toBeNull();
    expect(mapPaystackStatus(undefined)).toBeNull();
    expect(mapPaystackStatus(42)).toBeNull();
  });
});

describe("extractSubscriptionCode", () => {
  it("reads subscription.* events", () => {
    expect(extractSubscriptionCode({ subscription_code: "SUB_abc123" })).toBe(
      "SUB_abc123",
    );
  });

  it("reads invoice.* events that nest the subscription", () => {
    expect(
      extractSubscriptionCode({ subscription: { subscription_code: "SUB_x1" } }),
    ).toBe("SUB_x1");
  });

  it("accepts a plain string in `subscription`", () => {
    expect(extractSubscriptionCode({ subscription: "SUB_plain" })).toBe(
      "SUB_plain",
    );
  });

  it("returns null when there is nothing usable", () => {
    expect(extractSubscriptionCode(null)).toBeNull();
    expect(extractSubscriptionCode({})).toBeNull();
    expect(extractSubscriptionCode({ subscription: 123 })).toBeNull();
    expect(extractSubscriptionCode([])).toBeNull();
  });

  it("refuses codes that could alter the request path", () => {
    expect(extractSubscriptionCode({ subscription_code: "../customer" })).toBeNull();
    expect(extractSubscriptionCode({ subscription_code: "SUB_a/b" })).toBeNull();
    expect(extractSubscriptionCode({ subscription_code: "SUB_a?x=1" })).toBeNull();
    expect(extractSubscriptionCode({ subscription_code: "a".repeat(65) })).toBeNull();
  });
});

describe("parseNextPaymentDate", () => {
  it("normalises valid dates to ISO", () => {
    expect(parseNextPaymentDate("2026-11-20T00:00:00.000Z")).toBe(
      "2026-11-20T00:00:00.000Z",
    );
    expect(parseNextPaymentDate("2026-11-20")).toBe("2026-11-20T00:00:00.000Z");
  });

  it("returns null for missing or invalid values", () => {
    expect(parseNextPaymentDate(null)).toBeNull();
    expect(parseNextPaymentDate("")).toBeNull();
    expect(parseNextPaymentDate("soon")).toBeNull();
    expect(parseNextPaymentDate(1234)).toBeNull();
  });
});

describe("parseAllowedPlanCodes", () => {
  it("splits, trims and drops blanks", () => {
    expect(parseAllowedPlanCodes(" PLN_a , PLN_b,, ")).toEqual(["PLN_a", "PLN_b"]);
  });

  it("is empty when unset", () => {
    expect(parseAllowedPlanCodes(undefined)).toEqual([]);
    expect(parseAllowedPlanCodes("")).toEqual([]);
  });
});

describe("parsePaystackSubscription", () => {
  it("reads a typical subscription object", () => {
    const parsed = parsePaystackSubscription({
      status: "non-renewing",
      next_payment_date: "2026-11-20T00:00:00.000Z",
      customer: { email: " a@b.com ", customer_code: "CUS_1" },
      plan: { plan_code: "PLN_m" },
    });
    expect(parsed).toEqual({
      rawStatus: "non-renewing",
      mapped: { status: "active", cancelAtPeriodEnd: true },
      nextPaymentDate: "2026-11-20T00:00:00.000Z",
      customerEmail: "a@b.com",
      customerCode: "CUS_1",
      planCode: "PLN_m",
    });
  });

  it("accepts the plan as a plain string", () => {
    expect(parsePaystackSubscription({ plan: "PLN_s" }).planCode).toBe("PLN_s");
  });

  it("copes with a payload that has almost nothing in it", () => {
    expect(parsePaystackSubscription(undefined)).toEqual({
      rawStatus: null,
      mapped: null,
      nextPaymentDate: null,
      customerEmail: null,
      customerCode: null,
      planCode: null,
    });
  });
});

describe("buildSubscriptionRow", () => {
  const now = new Date("2026-10-20T10:00:00.000Z");
  const mapped = { status: "active", cancelAtPeriodEnd: false } as const;

  it("includes optional columns when Paystack supplied them", () => {
    const row = buildSubscriptionRow({
      userId: "u1",
      subscriptionCode: "SUB_1",
      planCode: "PLN_m",
      mapped,
      parsed: parsePaystackSubscription({
        status: "active",
        next_payment_date: "2026-11-20T00:00:00.000Z",
        customer: { email: "a@b.com", customer_code: "CUS_1" },
        plan: { plan_code: "PLN_m" },
      }),
      now,
    });
    expect(row).toEqual({
      user_id: "u1",
      status: "active",
      cancel_at_period_end: false,
      paystack_subscription_code: "SUB_1",
      plan_code: "PLN_m",
      updated_at: "2026-10-20T10:00:00.000Z",
      paystack_customer_code: "CUS_1",
      current_period_end: "2026-11-20T00:00:00.000Z",
    });
  });

  it("omits optional columns when missing, so existing values survive an upsert", () => {
    const row = buildSubscriptionRow({
      userId: "u1",
      subscriptionCode: "SUB_1",
      planCode: "PLN_m",
      mapped: { status: "cancelled", cancelAtPeriodEnd: false },
      parsed: parsePaystackSubscription({
        status: "cancelled",
        next_payment_date: null,
        customer: { email: "a@b.com" },
        plan: { plan_code: "PLN_m" },
      }),
      now,
    });
    expect("current_period_end" in row).toBe(false);
    expect("paystack_customer_code" in row).toBe(false);
  });
});

describe("isStaleSubscriptionUpdate", () => {
  const active = { status: "active", cancelAtPeriodEnd: false } as const;
  const cancelling = { status: "active", cancelAtPeriodEnd: true } as const;
  const ended = { status: "cancelled", cancelAtPeriodEnd: false } as const;
  const failing = { status: "past_due", cancelAtPeriodEnd: false } as const;

  const live = { status: "active", paystack_subscription_code: "SUB_new" } as const;

  it("never blocks the first subscription or the same subscription", () => {
    expect(isStaleSubscriptionUpdate(null, "SUB_a", ended)).toBe(false);
    expect(
      isStaleSubscriptionUpdate(
        { status: "free", paystack_subscription_code: null },
        "SUB_a",
        ended,
      ),
    ).toBe(false);
    expect(isStaleSubscriptionUpdate(live, "SUB_new", ended)).toBe(false);
  });

  it("lets a different subscription take over only when it is plainly healthy", () => {
    expect(isStaleSubscriptionUpdate(live, "SUB_old", active)).toBe(false);
  });

  it("blocks an older subscription that is ending, cancelling or failing", () => {
    expect(isStaleSubscriptionUpdate(live, "SUB_old", ended)).toBe(true);
    expect(isStaleSubscriptionUpdate(live, "SUB_old", cancelling)).toBe(true);
    expect(isStaleSubscriptionUpdate(live, "SUB_old", failing)).toBe(true);
  });
});

describe("redactEventForStorage", () => {
  it("drops card details and trims the customer to identifiers", () => {
    const stored = redactEventForStorage({
      event: "subscription.create",
      data: {
        subscription_code: "SUB_1",
        authorization: { last4: "4081", bin: "408408", signature: "SIG_x" },
        customer: {
          id: 7,
          customer_code: "CUS_1",
          email: "a@b.com",
          first_name: "Ada",
          phone: "+2348000000000",
        },
        nested: [{ log: { history: [] }, keep: "yes" }],
      },
    });

    expect(stored).toEqual({
      event: "subscription.create",
      data: {
        subscription_code: "SUB_1",
        customer: { id: 7, customer_code: "CUS_1", email: "a@b.com" },
        nested: [{ keep: "yes" }],
      },
    });
  });

  it("does not mutate its input", () => {
    const input = { data: { authorization: { last4: "1" } } };
    redactEventForStorage(input);
    expect(input.data.authorization.last4).toBe("1");
  });
});