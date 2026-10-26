export function formatSignedDollars(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}$${formatNumber(Math.abs(value), decimals)}`;
}

export function formatDollars(value: number, decimals = 2): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}$${formatNumber(Math.abs(value), decimals)}`;
}

export function formatCompactDollars(value: number): string {
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}$${trim(abs / 1_000_000)}m`;
  if (abs >= 1_000) return `${sign}$${trim(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function trim(n: number): string {
  return String(Number(n.toFixed(1)));
}

function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}