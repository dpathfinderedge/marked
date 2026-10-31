import type { Trade } from "@/types/trade";

export const MAX_CHECKLIST_ITEMS = 10;
export const MAX_CHECKLIST_ITEM_LENGTH = 80;
export const MAX_RECAP_LENGTH = 2000;

export const MIN_ADHERENCE_SAMPLE = 3;

export function cleanChecklistItems(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of items) {
    const item = raw.trim().replace(/\s+/g, " ").slice(0, MAX_CHECKLIST_ITEM_LENGTH).trim();
    const key = item.toLowerCase();
    if (item === "" || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length === MAX_CHECKLIST_ITEMS) break;
  }
  return result;
}

export function readChecklistItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return cleanChecklistItems(value.filter((v): v is string => typeof v === "string"));
}

export function cleanRecap(note: string): string {
  return note.trim().slice(0, MAX_RECAP_LENGTH);
}

export type ChecklistOutcome = "all" | "some" | "none" | "unused";

export function checklistOutcome(
  trade: Pick<Trade, "checklistPassed" | "checklistTotal">,
): ChecklistOutcome {
  const { checklistPassed: passed, checklistTotal: total } = trade;
  if (passed === null || total === null || total <= 0) return "unused";
  if (passed >= total) return "all";
  return passed === 0 ? "none" : "some";
}

export interface AdherenceGroup {
  trades: number;
  winRate: number;
  netPnl: number;
  expectancy: number;
}

export interface Adherence {
  followed: AdherenceGroup | null;
  skipped: AdherenceGroup | null;
  unused: number;
}

function summarize(trades: Trade[]): AdherenceGroup | null {
  if (trades.length === 0) return null;
  const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  return {
    trades: trades.length,
    winRate: trades.filter((t) => t.pnl > 0).length / trades.length,
    netPnl,
    expectancy: netPnl / trades.length,
  };
}

export function adherenceStats(trades: Trade[]): Adherence | null {
  const followed = trades.filter((t) => checklistOutcome(t) === "all");
  const skipped = trades.filter((t) => {
    const outcome = checklistOutcome(t);
    return outcome === "some" || outcome === "none";
  });
  if (followed.length + skipped.length === 0) return null;
  return {
    followed: summarize(followed),
    skipped: summarize(skipped),
    unused: trades.filter((t) => checklistOutcome(t) === "unused").length,
  };
}

export function hasEnoughToCompare(adherence: Adherence): boolean {
  return (
    (adherence.followed?.trades ?? 0) >= MIN_ADHERENCE_SAMPLE &&
    (adherence.skipped?.trades ?? 0) >= MIN_ADHERENCE_SAMPLE
  );
}