import type { SubscriptionStatus } from "@/context/subscription-context";
import { formatNaira } from "@/lib/billing/plans";

export interface CardInfo {
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
}

export interface PaymentInfo {
  reference: string;
  /** In kobo. */
  amount: number;
  currency: string;
  paidAt: string | null;
}

export interface SubscriptionDetails {
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  planCode: string | null;
  nextPaymentDate: string | null;
  card: CardInfo | null;
  payments: PaymentInfo[];
}

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseCard(value: unknown): CardInfo | null {
  if (!isDict(value) || str(value.last4) === "") return null;
  return {
    brand: str(value.brand),
    last4: str(value.last4),
    expMonth: str(value.expMonth),
    expYear: str(value.expYear),
  };
}

function parsePayment(value: unknown): PaymentInfo | null {
  if (!isDict(value)) return null;
  if (typeof value.reference !== "string") return null;
  if (typeof value.amount !== "number") return null;
  return {
    reference: value.reference,
    amount: value.amount,
    currency: str(value.currency) || "NGN",
    paidAt: typeof value.paidAt === "string" ? value.paidAt : null,
  };
}

const STATUSES: SubscriptionStatus[] = ["free", "active", "past_due", "cancelled"];

export function parseSubscriptionDetails(
  value: unknown,
): SubscriptionDetails | null {
  if (!isDict(value)) return null;
  const status = STATUSES.find((s) => s === value.status);
  if (!status) return null;

  const payments = Array.isArray(value.payments)
    ? value.payments
        .map(parsePayment)
        .filter((p): p is PaymentInfo => p !== null)
    : [];

  return {
    status,
    cancelAtPeriodEnd: value.cancelAtPeriodEnd === true,
    planCode: typeof value.planCode === "string" ? value.planCode : null,
    nextPaymentDate:
      typeof value.nextPaymentDate === "string" ? value.nextPaymentDate : null,
    card: parseCard(value.card),
    payments,
  };
}

export function formatDate(iso: string, timeZone?: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return new Date(time).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  });
}

export function describeCard(card: CardInfo): string {
  const brand = card.brand.trim();
  const name = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Card";
  const expiry =
    card.expMonth && card.expYear
      ? ` · expires ${card.expMonth.padStart(2, "0")}/${card.expYear}`
      : "";
  return `${name} ending ${card.last4}${expiry}`;
}

export function describeAmount(payment: PaymentInfo): string {
  const major = payment.amount / 100;
  if (payment.currency === "NGN") return formatNaira(Math.round(major));
  return `${payment.currency} ${major.toFixed(2)}`;
}