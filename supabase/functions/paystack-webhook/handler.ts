import {
  buildSubscriptionRow,
  extractSubscriptionCode,
  isRecord,
  isStaleSubscriptionUpdate,
  parseAllowedPlanCodes,
  parsePaystackSubscription,
  redactEventForStorage,
  sha256Hex,
  verifyPaystackSignature,
  type ExistingSubscription,
  type SubscriptionRow,
} from "./logic.ts";
import { stopRenewal } from "../_shared/paystack.ts";

export type EventOutcomeStatus = "processed" | "ignored" | "failed";

export interface WebhookStore {
  claimEvent(event: {
    id: string;
    event: string;
    payload: unknown;
  }): Promise<"new" | "retry" | "duplicate">;
  finishEvent(
    id: string,
    status: EventOutcomeStatus,
    note?: string,
  ): Promise<void>;
  findUserIdByEmail(email: string): Promise<string | null>;
  getSubscription(userId: string): Promise<ExistingSubscription | null>;
  upsertSubscription(row: SubscriptionRow): Promise<void>;
}

export interface WebhookDeps {
  env: (name: string) => string | undefined;
  store: WebhookStore;
  fetch: typeof fetch;
  now?: () => Date;
  paystackApiBase?: string;
}

interface Outcome {
  status: "processed" | "ignored";
  note: string;
}

const PAYSTACK_API_BASE = "https://api.paystack.co";
const PAYSTACK_TIMEOUT_MS = 8000;

const HANDLED_EVENTS = new Set([
  "subscription.create",
  "subscription.not_renew",
  "subscription.disable",
  "invoice.update",
  "invoice.payment_failed",
]);

function respond(body: string | object, status: number): Response {
  if (typeof body === "string") return new Response(body, { status });
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fetchPaystackSubscription(
  code: string,
  secret: string,
  deps: WebhookDeps,
): Promise<unknown> {
  const base = (deps.paystackApiBase ?? PAYSTACK_API_BASE).replace(/\/+$/, "");
  const response = await deps.fetch(
    `${base}/subscription/${encodeURIComponent(code)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(PAYSTACK_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Paystack answered ${response.status} when fetching the subscription`,
    );
  }

  const body: unknown = await response.json();
  if (!isRecord(body) || !isRecord(body.data)) {
    throw new Error("Paystack returned an unexpected subscription response");
  }
  return body.data;
}

async function processEvent(
  eventName: string,
  data: unknown,
  secret: string,
  deps: WebhookDeps,
): Promise<Outcome> {
  if (!HANDLED_EVENTS.has(eventName)) {
    return { status: "ignored", note: "event type is not used" };
  }

  const allowedPlans = parseAllowedPlanCodes(deps.env("PAYSTACK_PLAN_CODES"));
  if (allowedPlans.length === 0) {
    throw new Error("PAYSTACK_PLAN_CODES is not configured");
  }

  const code = extractSubscriptionCode(data);
  if (!code) {
    throw new Error(`No subscription code found in a ${eventName} payload`);
  }

  const subscription = await fetchPaystackSubscription(code, secret, deps);
  const parsed = parsePaystackSubscription(subscription);

  if (!parsed.planCode) {
    throw new Error("The Paystack subscription has no plan code");
  }
  if (!allowedPlans.includes(parsed.planCode)) {
    return {
      status: "ignored",
      note: `plan ${parsed.planCode} is not a Marked plan`,
    };
  }

  if (!parsed.mapped) {
    throw new Error(
      `Unrecognised Paystack subscription status "${parsed.rawStatus ?? ""}"`,
    );
  }
  if (!parsed.customerEmail) {
    throw new Error("The Paystack subscription has no customer email");
  }

  const userId = await deps.store.findUserIdByEmail(parsed.customerEmail);
  if (!userId) {
    return {
      status: "ignored",
      note: "no Marked account matches the customer email",
    };
  }

  const existing = await deps.store.getSubscription(userId);
  if (isStaleSubscriptionUpdate(existing, code, parsed.mapped)) {
    return {
      status: "ignored",
      note: "stale: an older subscription changed while a newer one is in use",
    };
  }

  let replaced = "";
  const previousCode = existing?.paystack_subscription_code;
  const isHealthy =
    parsed.mapped.status === "active" && !parsed.mapped.cancelAtPeriodEnd;
  if (previousCode && previousCode !== code && isHealthy) {
    const result = await stopRenewal(
      { secret, fetch: deps.fetch, baseUrl: deps.paystackApiBase },
      previousCode,
    );
    replaced = `; replaced ${previousCode} (${result})`;
  }

  const row = buildSubscriptionRow({
    userId,
    subscriptionCode: code,
    planCode: parsed.planCode,
    mapped: parsed.mapped,
    parsed,
    now: (deps.now ?? (() => new Date()))(),
  });
  await deps.store.upsertSubscription(row);

  return {
    status: "processed",
    note: `${eventName} -> ${row.status}${row.cancel_at_period_end ? " (cancelling)" : ""}${replaced}`,
  };
}

async function finishQuietly(
  store: WebhookStore,
  id: string,
  status: EventOutcomeStatus,
  note: string,
): Promise<void> {
  try {
    await store.finishEvent(id, status, note);
  } catch (error) {
    console.error("Could not record webhook outcome", error);
  }
}

export async function handleWebhook(
  req: Request,
  deps: WebhookDeps,
): Promise<Response> {
  if (req.method !== "POST") return respond("Method not allowed", 405);

  const secret = deps.env("PAYSTACK_SECRET_KEY");
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY is not configured");
    return respond("Webhook is not configured", 500);
  }

  const signature = req.headers.get("x-paystack-signature");
  if (!signature) return respond("Missing signature", 401);

  const rawBody = await req.text();
  if (!(await verifyPaystackSignature(rawBody, signature, secret))) {
    return respond("Invalid signature", 401);
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return respond("Invalid JSON", 400);
  }
  if (!isRecord(event) || typeof event.event !== "string") {
    return respond("Missing event name", 400);
  }
  const eventName = event.event;

  let eventId: string;
  try {
    eventId = await sha256Hex(rawBody);
    const claim = await deps.store.claimEvent({
      id: eventId,
      event: eventName,
      payload: redactEventForStorage(event),
    });
    if (claim === "duplicate") {
      return respond({ received: true, duplicate: true }, 200);
    }
  } catch (error) {
    console.error("Could not record webhook event", error);
    return respond({ received: false }, 500);
  }

  try {
    const outcome = await processEvent(eventName, event.data, secret, deps);
    await finishQuietly(deps.store, eventId, outcome.status, outcome.note);
    return respond({ received: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Webhook ${eventName} failed: ${message}`);
    await finishQuietly(deps.store, eventId, "failed", message);
    return respond({ received: false }, 500);
  }
}