export type SubscriptionStatus = "free" | "active" | "past_due" | "cancelled";

export interface MappedStatus {
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
}

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifyPaystackSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  return timingSafeEqual(toHex(digest), signature.trim().toLowerCase());
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return toHex(digest);
}

const CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function asSafeCode(value: unknown): string | null {
  return typeof value === "string" && CODE_PATTERN.test(value) ? value : null;
}

export function extractSubscriptionCode(data: unknown): string | null {
  if (!isRecord(data)) return null;

  const direct = asSafeCode(data.subscription_code);
  if (direct) return direct;

  const nested = data.subscription;
  if (isRecord(nested)) return asSafeCode(nested.subscription_code);
  return asSafeCode(nested);
}

export function mapPaystackStatus(raw: unknown): MappedStatus | null {
  if (typeof raw !== "string") return null;

  switch (raw.trim().toLowerCase().replace(/_/g, "-")) {
    case "active":
      return { status: "active", cancelAtPeriodEnd: false };
    case "non-renewing":
      return { status: "active", cancelAtPeriodEnd: true };
    case "attention":
      return { status: "past_due", cancelAtPeriodEnd: false };
    case "completed":
    case "cancelled":
    case "canceled":
      return { status: "cancelled", cancelAtPeriodEnd: false };
    default:
      return null;
  }
}

export function parseNextPaymentDate(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const time = Date.parse(raw);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export function parseAllowedPlanCodes(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

export interface ParsedPaystackSubscription {
  rawStatus: string | null;
  mapped: MappedStatus | null;
  nextPaymentDate: string | null;
  customerEmail: string | null;
  customerCode: string | null;
  planCode: string | null;
}

export function parsePaystackSubscription(
  data: unknown,
): ParsedPaystackSubscription {
  const record = isRecord(data) ? data : {};
  const customer = isRecord(record.customer) ? record.customer : {};
  const plan = record.plan;

  const planCode =
    typeof plan === "string"
      ? plan
      : isRecord(plan) && typeof plan.plan_code === "string"
        ? plan.plan_code
        : null;

  const email =
    typeof customer.email === "string" ? customer.email.trim() : "";
  const customerCode =
    typeof customer.customer_code === "string" ? customer.customer_code : null;

  return {
    rawStatus: typeof record.status === "string" ? record.status : null,
    mapped: mapPaystackStatus(record.status),
    nextPaymentDate: parseNextPaymentDate(record.next_payment_date),
    customerEmail: email === "" ? null : email,
    customerCode,
    planCode: planCode === "" ? null : planCode,
  };
}

export interface SubscriptionRow {
  user_id: string;
  status: SubscriptionStatus;
  cancel_at_period_end: boolean;
  paystack_subscription_code: string;
  plan_code: string;
  updated_at: string;
  paystack_customer_code?: string;
  current_period_end?: string;
}

export function buildSubscriptionRow(args: {
  userId: string;
  subscriptionCode: string;
  planCode: string;
  mapped: MappedStatus;
  parsed: ParsedPaystackSubscription;
  now: Date;
}): SubscriptionRow {
  const { userId, subscriptionCode, planCode, mapped, parsed, now } = args;

  const row: SubscriptionRow = {
    user_id: userId,
    status: mapped.status,
    cancel_at_period_end: mapped.cancelAtPeriodEnd,
    paystack_subscription_code: subscriptionCode,
    plan_code: planCode,
    updated_at: now.toISOString(),
  };

  if (parsed.customerCode) row.paystack_customer_code = parsed.customerCode;
  if (parsed.nextPaymentDate) row.current_period_end = parsed.nextPaymentDate;
  return row;
}

export interface ExistingSubscription {
  status: SubscriptionStatus;
  paystack_subscription_code: string | null;
}

export function isStaleSubscriptionUpdate(
  existing: ExistingSubscription | null,
  incomingCode: string,
  incoming: MappedStatus,
): boolean {
  const existingCode = existing?.paystack_subscription_code;
  if (!existingCode || existingCode === incomingCode) return false;

  const isHealthy = incoming.status === "active" && !incoming.cancelAtPeriodEnd;
  return !isHealthy;
}

const DROPPED_KEYS = new Set(["authorization", "log", "ip_address"]);
const KEPT_CUSTOMER_KEYS = ["id", "customer_code", "email"];
const MAX_DEPTH = 8;

function redact(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (!isRecord(value)) return value;

  const result: UnknownRecord = {};
  for (const [key, child] of Object.entries(value)) {
    if (DROPPED_KEYS.has(key)) continue;

    if (key === "customer" && isRecord(child)) {
      const slim: UnknownRecord = {};
      for (const keep of KEPT_CUSTOMER_KEYS) {
        if (keep in child) slim[keep] = child[keep];
      }
      result[key] = slim;
      continue;
    }

    result[key] = redact(child, depth + 1);
  }
  return result;
}

export function redactEventForStorage(event: unknown): unknown {
  return redact(event, 0);
}