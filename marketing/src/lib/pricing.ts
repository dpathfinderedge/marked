export const MONTHLY_PRICE_NGN = 12_000;
export const ANNUAL_DISCOUNT_PERCENT = 35;

export const ANNUAL_PRICE_NGN = Math.round(
  (MONTHLY_PRICE_NGN * 12 * (100 - ANNUAL_DISCOUNT_PERCENT)) / 100,
);
export const ANNUAL_SAVINGS_NGN = MONTHLY_PRICE_NGN * 12 - ANNUAL_PRICE_NGN;
export const ANNUAL_PER_MONTH_NGN = Math.round(ANNUAL_PRICE_NGN / 12);

export const FREE_TRADE_LIMIT = 50;

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-US")}`;
}