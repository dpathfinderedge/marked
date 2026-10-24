import { describe, expect, it, vi } from "vitest";
import {
  PaystackError,
  fetchSubscription,
  getManageLink,
  parseCard,
  parsePayments,
  stopRenewal,
  type PaystackDeps,
} from "./paystack.ts";

interface Call {
  method: string;
  path: string;
  body: unknown;
}

function fakePaystack(
  routes: (call: Call) => { status?: number; body: unknown },
) {
  const calls: Call[] = [];
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const parsed = new URL(String(url));
    const call: Call = {
      method: init?.method ?? "GET",
      path: parsed.pathname + parsed.search,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const { status = 200, body } = routes(call);
    return new Response(JSON.stringify(body), { status });
  });
  const deps: PaystackDeps = {
    secret: "sk_test",
    fetch: fetchFn as unknown as typeof fetch,
  };
  return { deps, calls, fetchFn };
}

const sub = (status: string, extra: Record<string, unknown> = {}) => ({
  status: true,
  data: {
    status,
    subscription_code: "SUB_1",
    email_token: "tok_1",
    plan: { plan_code: "PLN_m" },
    customer: { id: 42, email: "a@b.co", customer_code: "CUS_1" },
    ...extra,
  },
});

describe("stopRenewal", () => {
  it("disables a running subscription using its email token", async () => {
    const { deps, calls } = fakePaystack((call) =>
      call.method === "GET"
        ? { body: sub("active") }
        : { body: { status: true, message: "ok" } },
    );
    await expect(stopRenewal(deps, "SUB_1")).resolves.toBe("stopped");
    expect(calls[1]).toMatchObject({
      method: "POST",
      path: "/subscription/disable",
      body: { code: "SUB_1", token: "tok_1" },
    });
  });

  it("does nothing if it is already set not to renew", async () => {
    const { deps, calls } = fakePaystack(() => ({ body: sub("non-renewing") }));
    await expect(stopRenewal(deps, "SUB_1")).resolves.toBe("already_stopped");
    expect(calls).toHaveLength(1);
  });

  it("does nothing if it has already ended", async () => {
    const { deps, calls } = fakePaystack(() => ({ body: sub("cancelled") }));
    await expect(stopRenewal(deps, "SUB_1")).resolves.toBe("finished");
    expect(calls).toHaveLength(1);
  });

  it("treats a subscription Paystack no longer has as finished", async () => {
    const { deps } = fakePaystack(() => ({
      status: 404,
      body: { status: false, message: "Subscription not found" },
    }));
    await expect(stopRenewal(deps, "SUB_gone")).resolves.toBe("finished");
  });

  it("throws on other Paystack failures so callers can retry", async () => {
    const { deps } = fakePaystack(() => ({
      status: 500,
      body: { status: false, message: "boom" },
    }));
    await expect(stopRenewal(deps, "SUB_1")).rejects.toBeInstanceOf(PaystackError);
  });

  it("throws if the status is unrecognised rather than guessing", async () => {
    const { deps } = fakePaystack(() => ({ body: sub("mystery") }));
    await expect(stopRenewal(deps, "SUB_1")).rejects.toThrow(/Unrecognised/);
  });

  it("throws if Paystack gives no email token", async () => {
    const { deps } = fakePaystack(() => ({
      body: sub("active", { email_token: undefined }),
    }));
    await expect(stopRenewal(deps, "SUB_1")).rejects.toThrow(/email token/);
  });

  it("treats status:false with HTTP 200 as a failure", async () => {
    const { deps } = fakePaystack((call) =>
      call.method === "GET"
        ? { body: sub("active") }
        : { body: { status: false, message: "Invalid token" } },
    );
    await expect(stopRenewal(deps, "SUB_1")).rejects.toThrow("Invalid token");
  });
});

describe("fetchSubscription", () => {
  it("returns the parsed subscription, token, customer id and card", async () => {
    const { deps } = fakePaystack(() => ({
      body: sub("active", {
        authorization: { brand: "visa ", last4: "4081", exp_month: "12", exp_year: "2030" },
      }),
    }));
    const result = await fetchSubscription(deps, "SUB_1");
    expect(result.emailToken).toBe("tok_1");
    expect(result.customerId).toBe(42);
    expect(result.parsed.planCode).toBe("PLN_m");
    expect(result.card).toEqual({ brand: "visa", last4: "4081", expMonth: "12", expYear: "2030" });
  });

  it("url-encodes the subscription code", async () => {
    const { deps, calls } = fakePaystack(() => ({ body: sub("active") }));
    await fetchSubscription(deps, "SUB/../x");
    expect(calls[0]?.path).toBe("/subscription/SUB%2F..%2Fx");
  });
});

describe("parseCard", () => {
  it("returns null without a last4", () => {
    expect(parseCard(null)).toBeNull();
    expect(parseCard({ brand: "visa" })).toBeNull();
    expect(parseCard({ last4: "" })).toBeNull();
  });
});

describe("getManageLink", () => {
  it("returns an https link", async () => {
    const { deps } = fakePaystack(() => ({
      body: { status: true, data: { link: "https://paystack.com/manage/subscriptions/SUB_1?subscription_token=x" } },
    }));
    await expect(getManageLink(deps, "SUB_1")).resolves.toMatch(/^https:\/\/paystack\.com\//);
  });

  it("refuses a missing or non-https link", async () => {
    for (const data of [{}, { link: "http://evil.test" }, { link: "javascript:alert(1)" }]) {
      const { deps } = fakePaystack(() => ({ body: { status: true, data } }));
      await expect(getManageLink(deps, "SUB_1")).rejects.toThrow(/no update link/);
    }
  });
});

describe("parsePayments", () => {
  const txn = (over: Record<string, unknown>) => ({
    status: "success",
    reference: "ref",
    amount: 1_200_000,
    currency: "NGN",
    paid_at: "2026-10-20T10:00:00.000Z",
    plan: { plan_code: "PLN_m" },
    ...over,
  });

  it("keeps successful payments on our plans, newest first as given", () => {
    const result = parsePayments(
      [
        txn({ reference: "a" }),
        txn({ reference: "b", plan_object: { plan_code: "PLN_y" }, plan: {} }),
        txn({ reference: "c", status: "failed" }),
        txn({ reference: "d", plan: { plan_code: "PLN_other_product" } }),
        txn({ reference: "e", plan: {} }),
        txn({ reference: "f", plan: "PLN_m" }),
      ],
      ["PLN_m", "PLN_y"],
      10,
    );
    expect(result.map((p) => p.reference)).toEqual(["a", "b", "e", "f"]);
    expect(result[0]).toEqual({
      reference: "a",
      amount: 1_200_000,
      currency: "NGN",
      paidAt: "2026-10-20T10:00:00.000Z",
    });
  });

  it("respects the limit and skips malformed rows", () => {
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => txn({ reference: `r${i}` })),
      null,
      "x",
      txn({ amount: "12" }),
    ];
    expect(parsePayments(rows, ["PLN_m"], 3)).toHaveLength(3);
    expect(parsePayments("nope", ["PLN_m"], 3)).toEqual([]);
  });

  it("keeps a payment with an unreadable date but no date", () => {
    const [payment] = parsePayments([txn({ paid_at: "garbage" })], ["PLN_m"], 3);
    expect(payment?.paidAt).toBeNull();
  });

  it("accepts a charge with no plan when it costs exactly one of our prices", () => {
    const rows = [
      txn({ reference: "monthly", plan: {}, amount: 1_200_000 }),
      txn({ reference: "yearly", plan: null, plan_object: {}, amount: 9_360_000 }),
      txn({ reference: "other-amount", plan: {}, amount: 500_000 }),
      txn({ reference: "other-product", plan: { plan_code: "PLN_nope" }, amount: 1_200_000 }),
    ];
    expect(parsePayments(rows, ["PLN_m"], 10).map((p) => p.reference)).toEqual([
      "monthly",
      "yearly",
    ]);
  });
});