import { getWeekDates, toIsoDate } from "@/utils/dates";

interface WeekStripProps {
  dailyPnl: Map<string, number>;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function WeekStrip({ dailyPnl }: WeekStripProps): JSX.Element {
  const today = new Date();
  const todayIso = toIsoDate(today);
  const weekDates = getWeekDates(today);

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDates.map((date, i) => {
        const iso = toIsoDate(date);
        const pnl = dailyPnl.get(iso);
        const hasTrades = pnl !== undefined;
        const isToday = iso === todayIso;

        const toneClass = hasTrades
          ? (pnl ?? 0) >= 0
            ? "bg-green/10"
            : "bg-stamp/10"
          : "bg-surface";

        return (
          <div
            key={iso}
            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 ${
              isToday ? "border-stamp" : "border-rule"
            } ${toneClass}`}
          >
            <span className="font-mono text-[10px] uppercase text-muted">
              {DAY_LABELS[i]}
            </span>
            <span className="font-mono text-xs text-ink">
              {date.getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}