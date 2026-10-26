import type { CalendarWeek } from "@/lib/calculations";
import { formatCompactDollars, formatSignedDollars } from "@/utils/format";
import { formatLongDate } from "@/utils/dates";

interface MonthGridProps {
  weeks: CalendarWeek[];
  maxAbsDay: number;
  selected: string;
  today: string;
  onSelect: (date: string) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const GRID = "grid grid-cols-7 gap-1 sm:grid-cols-[repeat(7,minmax(0,1fr))_5.5rem] sm:gap-1.5";

function tintClass(pnl: number, maxAbs: number): string {
  if (pnl === 0 || maxAbs === 0) return "bg-bg-2/50";
  const strength = Math.abs(pnl) / maxAbs;
  if (pnl > 0) {
    if (strength > 0.66) return "bg-signal-green/30";
    if (strength > 0.33) return "bg-signal-green/20";
    return "bg-signal-green/10";
  }
  if (strength > 0.66) return "bg-signal-red/30";
  if (strength > 0.33) return "bg-signal-red/20";
  return "bg-signal-red/10";
}

function toneText(pnl: number): string {
  if (pnl > 0) return "text-signal-green";
  if (pnl < 0) return "text-signal-red";
  return "text-text-muted";
}

export function MonthGrid({
  weeks,
  maxAbsDay,
  selected,
  today,
  onSelect,
}: MonthGridProps): JSX.Element {
  return (
    <div>
      <div className={`${GRID} mb-1.5`} aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1 text-center text-xs text-text-muted">
            {day}
          </div>
        ))}
        <div className="hidden py-1 text-center text-xs text-text-muted sm:block">
          Week
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:gap-1.5">
        {weeks.map((week) => (
          <div key={week.days[0]?.date} className={GRID}>
            {week.days.map((day) => {
              const hasTrades = day.trades > 0;
              const isSelected = day.date === selected;
              const isToday = day.date === today;
              const dayNumber = Number(day.date.slice(8));

              const label = hasTrades
                ? `${formatLongDate(day.date)}: ${formatSignedDollars(day.pnl)}, ${day.trades} trade${day.trades === 1 ? "" : "s"}`
                : `${formatLongDate(day.date)}: no trades`;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => onSelect(day.date)}
                  aria-label={label}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  className={`flex h-14 min-w-0 flex-col justify-between rounded-lg text-left transition-colors sm:h-[5.5rem] sm:p-2 p-1 ${
                    hasTrades ? tintClass(day.pnl, maxAbsDay) : "bg-bg-2/30 hover:bg-bg-2/60"
                  } ${day.inMonth ? "" : "opacity-40"} ${
                    isSelected
                      ? "ring-2 ring-text"
                      : "ring-1 ring-inset ring-line hover:ring-line-strong"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] sm:text-xs ${
                      isToday
                        ? "bg-signal-red font-semibold text-white"
                        : "text-text-muted"
                    }`}
                  >
                    {dayNumber}
                  </span>
                  {hasTrades ? (
                    <span className="min-w-0">
                      <span
                        className={`block truncate font-mono text-[9px] font-medium leading-tight tracking-tighter sm:text-sm sm:tracking-normal ${toneText(day.pnl)}`}
                      >
                        {formatCompactDollars(day.pnl)}
                      </span>
                      <span className="hidden text-[11px] text-text-muted sm:block">
                        {day.trades} trade{day.trades === 1 ? "" : "s"}
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}

            <div className="hidden min-w-0 flex-col justify-center rounded-lg border border-line px-2 py-2 sm:flex">
              {week.trades > 0 ? (
                <>
                  <span
                    className={`truncate font-mono text-sm font-medium ${toneText(week.pnl)}`}
                  >
                    {formatCompactDollars(week.pnl)}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {week.trades} trade{week.trades === 1 ? "" : "s"}
                  </span>
                </>
              ) : (
                <span className="text-center text-xs text-text-faint">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}