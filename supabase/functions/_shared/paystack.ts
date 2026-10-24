import {
  isRecord,
  mapPaystackStatus,
  parsePaystackSubscription,
  type ParsedPaystackSubscription,
} from "../paystack-webhook/logic.ts";

const PAYSTACK_API_BASE = "https://api.paystack.co";
const PAYSTACK_TIMEOUT_MS = 8000;

export interface PaystackDeps {
  secret: string;
  fetch: typeof fetch;
  baseUrl?: string;
}

export class PaystackError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PaystackError";
    this.status = status;
  }
}

async function call(
  deps: PaystackDeps,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const base = (deps.baseUrl ?? PAYSTACK_API_BASE).replace(/\/+$/, "");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${deps.secret}`,
  };
  if (body) headers["Content-Type"] = "application/json";

  const response = await deps.fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(PAYSTACK_TIMEOUT_MS),
  });

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    // Not JSON; handled below.
  }
  const record = isRecord(parsed) ? parsed : {};

  if (!response.ok || record.status === false) {
    const message =
      typeof record.message === "string" && record.message !== ""
        ? record.message
        : `Paystack answered ${response.status}`;
    throw new PaystackError(message, response.status);
  }
  return record;
}

export interface FetchedSubscription {
  raw: Record<string, unknown>;
  parsed: ParsedPaystackSubscription;
  emailToken: string | null;
  customerId: number | string | null;
  card: SubscriptionCard | null;
}

export interface SubscriptionCard {
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
}

export function parseCard(authorization: unknown): SubscriptionCard | null {
  if (!isRecord(authorization)) return null;
  const last4 = authorization.last4;
  if (typeof last4 !== "string" || last4 === "") return null;

  const text = (value: unknown): string =>
    typeof value === "string" || typeof value === "number"
      ? String(value)
      : "";

  return {
    brand: (text(authorization.brand) || text(authorization.card_type)).trim(),
    last4,
    expMonth: text(authorization.exp_month),
    expYear: text(authorization.exp_year),
  };
}

export async function fetchSubscription(
  deps: PaystackDeps,
  code: string,
): Promise<FetchedSubscription> {
  const body = await call(
    deps,
    "GET",
    `/subscription/${encodeURIComponent(code)}`,
  );
  if (!isRecord(body.data)) {
    throw new PaystackError("Paystack returned an unexpected response", 502);
  }

  const raw = body.data;
  const customer = isRecord(raw.customer) ? raw.customer : {};
  const customerId =
    typeof customer.id === "number" || typeof customer.id === "string"
      ? customer.id
      : null;

  return {
    raw,
    parsed: parsePaystackSubscription(raw),
    emailToken: typeof raw.email_token === "string" ? raw.email_token : null,
    customerId,
    card: parseCard(raw.authorization),
  };
}

export async function disableSubscription(
  deps: PaystackDeps,
  code: string,
  emailToken: string,
): Promise<void> {
  await call(deps, "POST", "/subscription/disable", {
    code,
    token: emailToken,
  });
}

export async function getManageLink(
  deps: PaystackDeps,
  code: string,
): Promise<string> {
  const body = await call(
    deps,
    "GET",
    `/subscription/${encodeURIComponent(code)}/manage/link`,
  );
  const data = isRecord(body.data) ? body.data : {};
  const link = data.link;
  if (typeof link !== "string" || !link.startsWith("https://")) {
    throw new PaystackError("Paystack returned no update link", 502);
  }
  return link;
}

export interface PaymentRecord {
  reference: string;
  /** In kobo. */
  amount: number;
  currency: string;
  paidAt: string | null;
}

function transactionPlanCode(transaction: Record<string, unknown>): string | null {
  for (const key of ["plan", "plan_object"]) {
    const value = transaction[key];
    if (typeof value === "string" && value !== "") return value;
    if (isRecord(value) && typeof value.plan_code === "string") {
      return value.plan_code;
    }
  }
  return null;
}

export const KNOWN_PRICES_KOBO: readonly number[] = [1_200_000, 9_360_000];

export function parsePayments(
  data: unknown,
  allowedPlans: string[],
  limit: number,
  knownAmounts: readonly number[] = KNOWN_PRICES_KOBO,
): PaymentRecord[] {
  if (!Array.isArray(data)) return [];

  const payments: PaymentRecord[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    if (item.status !== "success") continue;
    if (typeof item.reference !== "string") continue;
    if (typeof item.amount !== "number") continue;

    const plan = transactionPlanCode(item);
    const isOurs = plan
      ? allowedPlans.includes(plan)
      : knownAmounts.includes(item.amount);
    if (!isOurs) continue;

    const paidAt =
      typeof item.paid_at === "string" && !Number.isNaN(Date.parse(item.paid_at))
        ? new Date(item.paid_at).toISOString()
        : null;

    payments.push({
      reference: item.reference,
      amount: item.amount,
      currency: typeof item.currency === "string" ? item.currency : "NGN",
      paidAt,
    });
    if (payments.length >= limit) break;
  }
  return payments;
}

export async function listPayments(
  deps: PaystackDeps,
  customerId: number | string,
  allowedPlans: string[],
  limit = 10,
): Promise<PaymentRecord[]> {
  const query = new URLSearchParams({
    customer: String(customerId),
    status: "success",
    perPage: "50",
  });
  const body = await call(deps, "GET", `/transaction?${query.toString()}`);
  const payments = parsePayments(body.data, allowedPlans, limit);

  if (payments.length === 0 && Array.isArray(body.data) && body.data.length > 0) {
    // Helps diagnose a filter that is too strict, without logging personal data.
    const first = isRecord(body.data[0]) ? body.data[0] : {};
    console.log(
      `Payment history: Paystack returned ${body.data.length} transactions, none matched. ` +
        `First has plan=${JSON.stringify(first.plan)} plan_object=${JSON.stringify(first.plan_object)} amount=${String(first.amount)}`,
    );
  }
  return payments;
}

export type StopRenewalResult = "stopped" | "already_stopped" | "finished";

export async function stopRenewal(
  deps: PaystackDeps,
  code: string,
): Promise<StopRenewalResult> {
  let subscription: FetchedSubscription;
  try {
    subscription = await fetchSubscription(deps, code);
  } catch (error) {
    if (error instanceof PaystackError && error.status === 404) {
      return "finished";
    }
    throw error;
  }

  const mapped = mapPaystackStatus(subscription.parsed.rawStatus);
  if (!mapped) {
    throw new PaystackError(
      `Unrecognised Paystack subscription status "${subscription.parsed.rawStatus ?? ""}"`,
      502,
    );
  }
  if (mapped.status === "cancelled") return "finished";
  if (mapped.cancelAtPeriodEnd) return "already_stopped";

  if (!subscription.emailToken) {
    throw new PaystackError("Paystack returned no email token", 502);
  }
  await disableSubscription(deps, code, subscription.emailToken);
  return "stopped";
}