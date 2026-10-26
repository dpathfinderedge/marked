export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function getWeekDates(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isoToUtcMs(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function addDaysToIso(iso: string, days: number): string {
  const d = new Date(isoToUtcMs(iso) + days * MS_PER_DAY);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function weekdayOfIso(iso: string): number {
  return new Date(isoToUtcMs(iso)).getUTCDay();
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[(month ?? 1) - 1] ?? ""} ${day ?? ""}`;
}

export function formatLongDate(iso: string): string {
  return `${formatShortDate(iso)}, ${iso.slice(0, 4)}`;
}