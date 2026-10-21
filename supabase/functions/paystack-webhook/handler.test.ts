import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  handleWebhook,
  type EventOutcomeStatus,
  type WebhookDeps,
  type WebhookStore,
} from "./handler.ts";
import type { ExistingSubscription, SubscriptionRow } from "./logic.ts";

const SECRET = "sk_test_secret";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const EMAIL = "rasheed@example.com";
const NOW = new Date("2026-10-20T10:00:00.000Z");

function sign(body: string, secret: string = SECRET): string {
  return createHmac("sha512", secret).update(body).digest("hex");
}

function webhookRequest(
  payload: unknown,
  options: { signature?: string | null; method?: string } = {},
): Request {
  const body = JSON.stringify(payload);
  const headers = new Headers();
  const signature =
    options.signature === undefined ? sign(body) : options.signature;
  if (signature !== null) headers.set("x-paystack-signature", signature);
  const method = options.method ?? "POST";
  return new Request("https://example.test/paystack-webhook", {
    method,
    headers,
    body: method === "POST" ? body : undefined,
  });
}

interface StoredEvent {
  event: string;
  payload: unknown;
  status: EventOutcomeStatus | "processing";
  note?: string;
  attempts: number;
}

function createFakeStore(
  options: {
    users?: Record<string, string>;
    subscriptions?: Record<string, ExistingSubscription>;
  } = {},
) {
  const users = new Map(Object.entries(options.users ?? { [EMAIL]: USER_ID }));
  const subscriptions = new Map(Object.entries(options.subscriptions ?? {}));
  const events = new Map<string, StoredEvent>();
  const upserts: SubscriptionRow[] = [];

  const store: WebhookStore = {
    async claimEvent({ id, event, payload }) {
      const found = events.get(id);
      if (!found) {
        events.set(id, { event, payload, status: "processing", attempts: 1 });
        return "new";
      }
      if (found.status === "processed" || found.status === "ignored") {
        return "duplicate";
      }
      found.status = "processing";
      found.attempts += 1;
      return "retry";
    },
    async finishEvent(id, status, note) {
      const found = events.get(id);
      if (found) {
        found.status = status;
        found.note = note;
      }
    },
    async findUserIdByEmail(email) {
      return users.get(email.toLowerCase()) ?? null;
    },
    async getSubscription(userId) {
      return subscriptions.get(userId) ?? null;
    },
    async upsertSubscription(row) {
      upserts.push(row);
      subscriptions.set(row.user_id, {
        status: row.status,
        paystack_subscription_code: row.paystack_subscription_code,
      });
    },
  };

  return { store, events, upserts, subscriptions };
}

function paystackSubscription(overrides: Record<string, unknown> = {}) {
  return {
    status: "active",
    subscription_code: "SUB_abc",
    next_payment_date: "2026-11-20T00:00:00.000Z",
    customer: { email: "Rasheed@Example.com", customer_code: "CUS_1" },
    plan: { plan_code: "PLN_monthly" },
    ...overrides,
  };
}

function createFakePaystack(
  responder: () => { status: number; body: unknown },
) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const { status, body } = responder();
    return new Response(JSON.stringify(body), { status });
  });
}

function setup(
  options: {
    storeOptions?: Parameters<typeof createFakeStore>[0];
    subscription?: Record<string, unknown>;
    env?: Record<string, string | undefined>;
  } = {},
) {
  const fake = createFakeStore(options.storeOptions);
  const paystack = createFakePaystack(() => ({
    status: 200,
    body: { status: true, data: paystackSubscription(options.subscription) },
  }));

  const env: Record<string, string | undefined> = {
    PAYSTACK_SECRET_KEY: SECRET,
    PAYSTACK_PLAN_CODES: "PLN_monthly,PLN_annual",
    ...options.env,
  };

  const deps: WebhookDeps = {
    env: (name) => env[name],
    store: fake.store,
    fetch: paystack as unknown as typeof fetch,
    now: () => NOW,
  };

  return { ...fake, paystack, deps };
}

const createEvent = {
  event: "subscription.create",
  data: { subscription_code: "SUB_abc" },
};

describe("request validation", () => {
  it("rejects non-POST requests", async () => {
    const { deps } = setup();
    const res = await handleWebhook(webhookRequest(createEvent, { method: "GET" }), deps);
    expect(res.status).toBe(405);
  });

  it("returns 401 without touching anything when the signature is missing", async () => {
    const { deps, events, paystack } = setup();
    const res = await handleWebhook(webhookRequest(createEvent, { signature: null }), deps);
    expect(res.status).toBe(401);
    expect(events.size).toBe(0);
    expect(paystack).not.toHaveBeenCalled();
  });

  it("returns 401 for a forged signature", async () => {
    const { deps, events, upserts, paystack } = setup();
    const res = await handleWebhook(
      webhookRequest(createEvent, { signature: sign(JSON.stringify(createEvent), "attacker-key") }),
      deps,
    );
    expect(res.status).toBe(401);
    expect(events.size).toBe(0);
    expect(upserts).toHaveLength(0);
    expect(paystack).not.toHaveBeenCalled();
  });

  it("fails closed when the secret key is not configured", async () => {
    const { deps, upserts } = setup({ env: { PAYSTACK_SECRET_KEY: undefined } });
    const body = JSON.stringify(createEvent);
    const res = await handleWebhook(
      webhookRequest(createEvent, { signature: sign(body, "") }),
      deps,
    );
    expect(res.status).toBe(500);
    expect(upserts).toHaveLength(0);
  });

  it("returns 400 for a validly signed body that is not JSON", async () => {
    const { deps } = setup();
    const body = "not json";
    const req = new Request("https://example.test/", {
      method: "POST",
      headers: { "x-paystack-signature": sign(body) },
      body,
    });
    expect((await handleWebhook(req, deps)).status).toBe(400);
  });
});

describe("subscription lifecycle", () => {
  it("activates Pro on subscription.create using Paystack's own data", async () => {
    const { deps, upserts, events, paystack } = setup();

    const res = await handleWebhook(webhookRequest(createEvent), deps);

    expect(res.status).toBe(200);
    expect(upserts).toEqual([
      {
        user_id: USER_ID,
        status: "active",
        cancel_at_period_end: false,
        paystack_subscription_code: "SUB_abc",
        plan_code: "PLN_monthly",
        updated_at: NOW.toISOString(),
        paystack_customer_code: "CUS_1",
        current_period_end: "2026-11-20T00:00:00.000Z",
      },
    ]);
    expect([...events.values()][0]?.status).toBe("processed");

    const [url, init] = paystack.mock.calls[0] ?? [];
    expect(url).toBe("https://api.paystack.co/subscription/SUB_abc");
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`);
  });

  it("matches the customer email case-insensitively", async () => {
    const { deps, upserts } = setup({
      storeOptions: { users: { "rasheed@example.com": USER_ID } },
      subscription: { customer: { email: "RASHEED@EXAMPLE.COM", customer_code: "CUS_1" } },
    });
    await handleWebhook(webhookRequest(createEvent), deps);
    expect(upserts[0]?.user_id).toBe(USER_ID);
  });

  it("marks a cancelling subscription: still active, but flagged, with its end date", async () => {
    const { deps, upserts } = setup({ subscription: { status: "non-renewing" } });
    const res = await handleWebhook(
      webhookRequest({ event: "subscription.not_renew", data: { subscription_code: "SUB_abc" } }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(upserts[0]).toMatchObject({
      status: "active",
      cancel_at_period_end: true,
      current_period_end: "2026-11-20T00:00:00.000Z",
    });
  });

  it("extends the period on a renewal (invoice.update with a nested subscription)", async () => {
    const { deps, upserts } = setup({
      subscription: { next_payment_date: "2026-12-20T00:00:00.000Z" },
    });
    const res = await handleWebhook(
      webhookRequest({
        event: "invoice.update",
        data: { invoice_code: "INV_1", paid: true, subscription: { subscription_code: "SUB_abc" } },
      }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(upserts[0]).toMatchObject({
      status: "active",
      current_period_end: "2026-12-20T00:00:00.000Z",
    });
  });

  it("marks a failing renewal as past_due", async () => {
    const { deps, upserts } = setup({ subscription: { status: "attention" } });
    await handleWebhook(
      webhookRequest({
        event: "invoice.payment_failed",
        data: { subscription: { subscription_code: "SUB_abc" } },
      }),
      deps,
    );
    expect(upserts[0]).toMatchObject({ status: "past_due", cancel_at_period_end: false });
  });

  it("keeps the stored period end when a finished subscription reports none", async () => {
    const { deps, upserts } = setup({
      subscription: { status: "cancelled", next_payment_date: null },
    });
    await handleWebhook(
      webhookRequest({ event: "subscription.disable", data: { subscription_code: "SUB_abc" } }),
      deps,
    );
    expect(upserts[0]?.status).toBe("cancelled");
    expect("current_period_end" in (upserts[0] ?? {})).toBe(false);
  });

  it("lets a new subscription replace an old, ended one", async () => {
    const { deps, upserts } = setup({
      storeOptions: {
        subscriptions: { [USER_ID]: { status: "cancelled", paystack_subscription_code: "SUB_old" } },
      },
    });
    await handleWebhook(webhookRequest(createEvent), deps);
    expect(upserts[0]).toMatchObject({ status: "active", paystack_subscription_code: "SUB_abc" });
  });

  it("ignores a late 'ended' event from an old subscription while a newer one is live", async () => {
    const { deps, upserts, events } = setup({
      storeOptions: {
        subscriptions: { [USER_ID]: { status: "active", paystack_subscription_code: "SUB_new" } },
      },
      subscription: { status: "cancelled" },
    });
    const res = await handleWebhook(
      webhookRequest({ event: "subscription.disable", data: { subscription_code: "SUB_old" } }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(upserts).toHaveLength(0);
    expect([...events.values()][0]?.status).toBe("ignored");
  });
});

describe("events that must not change anyone's plan", () => {
  it("ignores a subscription on a plan that is not Marked's (shared Paystack account)", async () => {
    const { deps, upserts, events } = setup({
      subscription: { plan: { plan_code: "PLN_other_product" } },
    });
    const res = await handleWebhook(webhookRequest(createEvent), deps);
    expect(res.status).toBe(200);
    expect(upserts).toHaveLength(0);
    expect([...events.values()][0]?.status).toBe("ignored");
  });

  it("ignores a customer who has no Marked account", async () => {
    const { deps, upserts, events } = setup({ storeOptions: { users: {} } });
    const res = await handleWebhook(webhookRequest(createEvent), deps);
    expect(res.status).toBe(200);
    expect(upserts).toHaveLength(0);
    expect([...events.values()][0]?.status).toBe("ignored");
  });

  it("acknowledges unrelated events without calling Paystack", async () => {
    const { deps, paystack, upserts } = setup();
    const res = await handleWebhook(
      webhookRequest({ event: "charge.success", data: { reference: "r1", plan: {} } }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(paystack).not.toHaveBeenCalled();
    expect(upserts).toHaveLength(0);
  });

  it("ignores everything when PAYSTACK_PLAN_CODES is not set (fails loudly)", async () => {
    const { deps, upserts, events } = setup({ env: { PAYSTACK_PLAN_CODES: undefined } });
    const res = await handleWebhook(webhookRequest(createEvent), deps);
    expect(res.status).toBe(500);
    expect(upserts).toHaveLength(0);
    expect([...events.values()][0]?.status).toBe("failed");
  });
});

describe("duplicates and retries", () => {
  it("does nothing the second time Paystack sends the same event", async () => {
    const { deps, upserts, paystack } = setup();
    await handleWebhook(webhookRequest(createEvent), deps);
    const second = await handleWebhook(webhookRequest(createEvent), deps);

    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true, duplicate: true });
    expect(upserts).toHaveLength(1);
    expect(paystack).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when Paystack's API fails, then succeeds on Paystack's retry", async () => {
    const fake = createFakeStore();
    let healthy = false;
    const paystack = createFakePaystack(() =>
      healthy
        ? { status: 200, body: { status: true, data: paystackSubscription() } }
        : { status: 503, body: { status: false } },
    );
    const deps: WebhookDeps = {
      env: (name) => ({ PAYSTACK_SECRET_KEY: SECRET, PAYSTACK_PLAN_CODES: "PLN_monthly" })[name],
      store: fake.store,
      fetch: paystack as unknown as typeof fetch,
      now: () => NOW,
    };

    const first = await handleWebhook(webhookRequest(createEvent), deps);
    expect(first.status).toBe(500);
    expect([...fake.events.values()][0]).toMatchObject({ status: "failed", attempts: 1 });
    expect(fake.upserts).toHaveLength(0);

    healthy = true;
    const retry = await handleWebhook(webhookRequest(createEvent), deps);
    expect(retry.status).toBe(200);
    expect([...fake.events.values()][0]).toMatchObject({ status: "processed", attempts: 2 });
    expect(fake.upserts).toHaveLength(1);
  });

  it("fails loudly on a subscription status it does not recognise", async () => {
    const { deps, upserts, events } = setup({ subscription: { status: "paused" } });
    const res = await handleWebhook(webhookRequest(createEvent), deps);
    expect(res.status).toBe(500);
    expect(upserts).toHaveLength(0);
    expect([...events.values()][0]?.note).toContain("paused");
  });

  it("fails loudly when the payload has no subscription code, without calling Paystack", async () => {
    const { deps, paystack, events } = setup();
    const res = await handleWebhook(
      webhookRequest({ event: "invoice.update", data: { invoice_code: "INV_1" } }),
      deps,
    );
    expect(res.status).toBe(500);
    expect(paystack).not.toHaveBeenCalled();
    expect([...events.values()][0]?.status).toBe("failed");
  });

  it("never lets a hostile code reach the Paystack URL", async () => {
    const { deps, paystack } = setup();
    const res = await handleWebhook(
      webhookRequest({ event: "subscription.create", data: { subscription_code: "../customer" } }),
      deps,
    );
    expect(res.status).toBe(500);
    expect(paystack).not.toHaveBeenCalled();
  });
});

describe("stored payloads", () => {
  it("keeps card details out of the audit table", async () => {
    const { deps, events } = setup();
    await handleWebhook(
      webhookRequest({
        event: "subscription.create",
        data: {
          subscription_code: "SUB_abc",
          authorization: { last4: "4081", signature: "SIG_x" },
          customer: { id: 1, customer_code: "CUS_1", email: EMAIL, phone: "0800" },
        },
      }),
      deps,
    );

    const stored = JSON.stringify([...events.values()][0]?.payload);
    expect(stored).not.toContain("4081");
    expect(stored).not.toContain("SIG_x");
    expect(stored).not.toContain("0800");
    expect(stored).toContain("CUS_1");
  });
});