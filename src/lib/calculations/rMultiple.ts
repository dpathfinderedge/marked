export function calculateRMultiple(
  pnl: number,
  risk: number | null,
): number | null {
  if (risk === null || risk <= 0) return null;
  return pnl / risk;
}