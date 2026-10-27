export function parseNumber(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

export function formatTrimmed(value: number, max = 6): string {
  if (!Number.isFinite(value)) return "—";
  return String(Number(value.toFixed(max)));
}

export function formatMoney(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPairPrice(value: number, pair: string): string {
  const decimals = pair.toUpperCase().endsWith("JPY") ? 3 : 5;
  return value.toFixed(decimals);
}

export const EMPTY_PROMPT = "Fill in the fields to see your result.";