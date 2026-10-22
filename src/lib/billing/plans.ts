export type BillingInterval = "monthly" | "annual";

export const MONTHLY_PRICE_NGN = 12_000;
export const ANNUAL_DISCOUNT_PERCENT = 35;

export const ANNUAL_PRICE_NGN = Math.round(
  (MONTHLY_PRICE_NGN * 12 * (100 - ANNUAL_DISCOUNT_PERCENT)) / 100,
);

export const ANNUAL_SAVINGS_NGN = MONTHLY_PRICE_NGN * 12 - ANNUAL_PRICE_NGN;

export const ANNUAL_PER_MONTH_NGN = Math.round(ANNUAL_PRICE_NGN / 12);

export function priceNgn(interval: BillingInterval): number {
  return interval === "annual" ? ANNUAL_PRICE_NGN : MONTHLY_PRICE_NGN;
}

export function toKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-US")}`;
}

export function intervalLabel(interval: BillingInterval): string {
  return interval === "annual" ? "Yearly" : "Monthly";
}

export function intervalUnit(interval: BillingInterval): string {
  return interval === "annual" ? "year" : "month";
}

export interface PlanCodes {
  monthly?: string;
  annual?: string;
}

export function getPlanInterval(
  planCode: string | null | undefined,
  codes: PlanCodes,
): BillingInterval | null {
  if (!planCode) return null;
  if (codes.monthly && planCode === codes.monthly) return "monthly";
  if (codes.annual && planCode === codes.annual) return "annual";
  return null;
}