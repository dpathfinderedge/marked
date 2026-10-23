import { describe, expect, it, vi } from "vitest";
import {
  handleManage,
  type ManageDeps,
  type ManageStore,
} from "./handler.ts";
import type { SubscriptionRow } from "../paystack-webhook/logic.ts";

const USER = "11111111-1111-1111-1111-111111111111";
const NOW = new Date("2026-10-20T10:00:00.000Z");

interface FakeState {
  status: string;
  lag?: boolean;
  enableFails?: boolean;
  transactionsFail?: boolean;
}

function setup(
  options: {
    state?: Partial<FakeState>;
    stored?: { paystack_subscription_code: string | null } | null;
    authenticated?: boolean;
    env?: Record<string, string | undefined>;
  } = {},
) {
  const state: FakeState = { status: "active", ...options.state };
  const requests: { method: string; path: string; body?: unknown }[] = [];
  const upserts: SubscriptionRow[] = [];
  const stored =
    options.stored === undefined
      ? { paystack_subscription_code: "SUB_1" }
      : options.stored;

  const paystack = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url));
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({ method, path: u.pathname + u.search, body });
    const ok = (data: unknown) =>
      new Response(JSON.stringify({ status: true, data }), { status: 200 });

    if (u.pathname === "/subscription/SUB_1" && method === "GET") {
      return ok({
        status: state.status,
        email_token: "tok_1",
        next_payment_date: "2026-11-20T00:00:00.000Z",
        plan: { plan_code: "PLN_m" },
        customer: { id: 42, email: "a@b.co", customer_code: "CUS_1" },
        authorization: { brand: "visa", last4: "4081", exp_month: "12", exp_year: "2030" },
      });
    }
    if (u.pathname === "/subscription/disable") {
      if (!state.lag) state.status = "non-renewing";
      return ok({});
    }
    if (u.pathname === "/subscription/enable") {
      if (state.enableFails) {
        return new Response(
          JSON.stringify({ status: false, message: "Cannot enable" }),
          { status: 400 },
        );
      }
      if (!state.lag) state.status = "active";
      return ok({});
    }
    if (u.pathname === "/subscription/SUB_1/manage/link") {
      return ok({ link: "https://paystack.com/manage/subscriptions/SUB_1?subscription_token=t" });
    }
    if (u.pathname === "/transaction") {
      if (state.transactionsFail) return new Response("{}", { status: 500 });
      return ok([
        { status: "success", reference: "r1", amount: 1_200_000, currency: "NGN", paid_at: "2026-10-20T10:00:00Z", plan: { plan_code: "PLN_m" } },
        { status: "success", reference: "other", amount: 500, currency: "NGN", paid_at: "2026-10-01T10:00:00Z", plan: {} },
      ]);
    }
    return new Response("{}", { status: 404 });
  });

  const store: ManageStore = {
    async getSubscription() {
      return stored;
    },
    async upsertSubscription(row) {
      upserts.push(row);
    },
  };

  const env: Record<string, string | undefined> = {
    PAYSTACK_SECRET_KEY: "sk_test",
    PAYSTACK_PLAN_CODES: "PLN_m,PLN_y",
    ...options.env,
  };

  const deps: ManageDeps = {
    env: (name) => env[name],
    fetch: paystack as unknown as typeof fetch,
    store,
    authenticate: async () => (options.authenticated === false ? null : { id: USER }),
    now: () => NOW,
  };

  const call = async (
    body: unknown,
    init: { method?: string; auth?: boolean } = {},
  ) => {
    const headers = new Headers({ "content-type": "application/json" });
    if (init.auth !== false) headers.set("Authorization", "Bearer user.jwt");
    const method = init.method ?? "POST";
    const response = await handleManage(
      new Request("https://example.test/manage-subscription", {
        method,
        headers,
        body: method === "POST" ? JSON.stringify(body) : undefined,
      }),
      deps,
    );
    return { response, json: (await response.json().catch(() => null)) as Record<string, unknown> | null };
  };

  return { call, requests, upserts, state };
}

describe("request checks", () => {
  it("answers CORS preflight", async () => {
    const { call } = setup();
    const { response } = await call(null, { method: "OPTIONS" });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("rejects other methods", async () => {
    const { call } = setup();
    expect((await call(null, { method: "GET" })).response.status).toBe(405);
  });

  it("requires a signed-in user", async () => {
    const noHeader = await setup().call({ action: "details" }, { auth: false });
    expect(noHeader.response.status).toBe(401);
    const badToken = await setup({ authenticated: false }).call({ action: "details" });
    expect(badToken.response.status).toBe(401);
  });

  it("rejects unknown actions without calling Paystack", async () => {
    const { call, requests } = setup();
    for (const body of [{ action: "refund" }, {}, null, { action: 5 }]) {
      expect((await call(body)).response.status).toBe(400);
    }
    expect(requests).toHaveLength(0);
  });

  it("fails closed when the Paystack key is missing", async () => {
    const { call } = setup({ env: { PAYSTACK_SECRET_KEY: undefined } });
    const { response, json } = await call({ action: "cancel" });
    expect(response.status).toBe(500);
    expect(json?.code).toBe("not_configured");
  });

  it("returns 404 when the user has no subscription", async () => {
    for (const stored of [null, { paystack_subscription_code: null }]) {
      const { call, requests } = setup({ stored });
      const { response, json } = await call({ action: "cancel" });
      expect(response.status).toBe(404);
      expect(json?.code).toBe("no_subscription");
      expect(requests).toHaveLength(0);
    }
  });
});

describe("details", () => {
  it("returns status, next payment, card and our own payments only", async () => {
    const { call } = setup();
    const { response, json } = await call({ action: "details" });
    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      status: "active",
      cancelAtPeriodEnd: false,
      planCode: "PLN_m",
      nextPaymentDate: "2026-11-20T00:00:00.000Z",
      card: { brand: "visa", last4: "4081", expMonth: "12", expYear: "2030" },
    });
    expect((json?.payments as { reference: string }[]).map((p) => p.reference)).toEqual(["r1"]);
  });

  it("never leaks the email token", async () => {
    const { call } = setup();
    const { json } = await call({ action: "details" });
    expect(JSON.stringify(json)).not.toContain("tok_1");
  });

  it("still returns details if payment history fails", async () => {
    const { call } = setup({ state: { transactionsFail: true } });
    const { response, json } = await call({ action: "details" });
    expect(response.status).toBe(200);
    expect(json?.payments).toEqual([]);
  });

  it("does not write to the database", async () => {
    const { call, upserts } = setup();
    await call({ action: "details" });
    expect(upserts).toHaveLength(0);
  });
});

describe("cancel", () => {
  it("disables at Paystack and records cancel-at-period-end", async () => {
    const { call, requests, upserts } = setup();
    const { response, json } = await call({ action: "cancel" });
    expect(response.status).toBe(200);
    expect(json).toMatchObject({ ok: true, status: "active", cancelAtPeriodEnd: true });
    expect(requests.find((r) => r.path === "/subscription/disable")?.body).toEqual({
      code: "SUB_1",
      token: "tok_1",
    });
    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({
      user_id: USER,
      status: "active",
      cancel_at_period_end: true,
      paystack_subscription_code: "SUB_1",
      plan_code: "PLN_m",
    });
  });

  it("records the cancellation even if Paystack's read lags behind", async () => {
    const { call, upserts } = setup({ state: { lag: true } });
    await call({ action: "cancel" });
    expect(upserts[0]?.cancel_at_period_end).toBe(true);
  });

  it("is idempotent: cancelling twice disables only once", async () => {
    const { call, requests } = setup();
    await call({ action: "cancel" });
    const second = await call({ action: "cancel" });
    expect(second.response.status).toBe(200);
    expect(requests.filter((r) => r.path === "/subscription/disable")).toHaveLength(1);
  });

  it("refuses to cancel something that already ended", async () => {
    const { call, upserts } = setup({ state: { status: "cancelled" } });
    const { response, json } = await call({ action: "cancel" });
    expect(response.status).toBe(409);
    expect(json?.code).toBe("subscription_ended");
    expect(upserts).toHaveLength(0);
  });

  it("returns a friendly error and writes nothing if Paystack fails", async () => {
    const { call, upserts, state } = setup();
    state.status = "mystery";
    const { response, json } = await call({ action: "cancel" });
    expect(response.status).toBe(502);
    expect(json?.code).toBe("provider_error");
    expect(String(json?.error)).not.toMatch(/mystery|Paystack answered/);
    expect(upserts).toHaveLength(0);
  });
});

describe("resume", () => {
  it("re-enables a subscription that was set to end", async () => {
    const { call, requests, upserts } = setup({ state: { status: "non-renewing" } });
    const { response, json } = await call({ action: "resume" });
    expect(response.status).toBe(200);
    expect(json).toMatchObject({ ok: true, status: "active", cancelAtPeriodEnd: false });
    expect(requests.some((r) => r.path === "/subscription/enable")).toBe(true);
    expect(upserts[0]?.cancel_at_period_end).toBe(false);
  });

  it("does nothing, successfully, if it was never cancelling", async () => {
    const { call, requests } = setup();
    const { response } = await call({ action: "resume" });
    expect(response.status).toBe(200);
    expect(requests.some((r) => r.path === "/subscription/enable")).toBe(false);
  });

  it("explains clearly if Paystack refuses to resume", async () => {
    const { call, upserts } = setup({ state: { status: "non-renewing", enableFails: true } });
    const { response, json } = await call({ action: "resume" });
    expect(response.status).toBe(409);
    expect(json?.code).toBe("resume_unavailable");
    expect(upserts).toHaveLength(0);
  });

  it("refuses to resume something that already ended", async () => {
    const { call } = setup({ state: { status: "cancelled" } });
    expect((await call({ action: "resume" })).response.status).toBe(409);
  });
});

describe("manage-link", () => {
  it("returns Paystack's card-update link", async () => {
    const { call } = setup({ state: { status: "attention" } });
    const { response, json } = await call({ action: "manage-link" });
    expect(response.status).toBe(200);
    expect(String(json?.link)).toMatch(/^https:\/\/paystack\.com\//);
  });

  it("is not offered once the subscription has ended", async () => {
    const { call } = setup({ state: { status: "cancelled" } });
    expect((await call({ action: "manage-link" })).response.status).toBe(409);
  });
});