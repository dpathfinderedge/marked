import { useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useDismiss } from "@/hooks/useDismiss";
import {
  DATE_PRESETS,
  detectPreset,
  formatRangeLabel,
  presetRange,
  type DatePreset,
} from "@/lib/calculations";
import { toIsoDate } from "@/utils/dates";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const DATE_INPUT =
  "w-full rounded-lg border border-line bg-bg-0 px-2.5 py-1.5 text-sm text-text outline-none transition-colors focus:border-line-strong";

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(rootRef, isOpen, () => setIsOpen(false));

  const today = toIsoDate(new Date());
  const activePreset = detectPreset(from, to, today);
  const isFiltered = from !== "" || to !== "";

  const pickPreset = (preset: DatePreset): void => {
    const range = presetRange(preset, today);
    onChange(range.from, range.to);
    setIsOpen(false);
  };

  const changeFrom = (value: string): void => {
    onChange(value, to !== "" && value > to ? value : to);
  };
  const changeTo = (value: string): void => {
    onChange(from !== "" && value !== "" && value < from ? value : from, value);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors hover:bg-bg-2 ${
          isFiltered ? "border-line-strong text-text" : "border-line text-text-muted"
        }`}
      >
        <CalendarDays size={15} className="shrink-0" />
        <span className="whitespace-nowrap">{formatRangeLabel(from, to)}</span>
        <ChevronDown size={14} className="shrink-0 text-text-faint" />
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Choose dates"
          className="absolute left-0 top-full z-30 mt-2 w-72 animate-pop-in rounded-xl border border-line bg-bg-1 p-3 shadow-xl motion-reduce:animate-none"
        >
          <ul className="grid grid-cols-2 gap-1">
            {DATE_PRESETS.map(({ value, label }) => (
              <li key={value}>
                <button
                  type="button"
                  onClick={() => pickPreset(value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                    activePreset === value
                      ? "bg-bg-2 font-medium text-text"
                      : "text-text-muted hover:bg-bg-2 hover:text-text"
                  }`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              From
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => changeFrom(e.target.value)}
                className={DATE_INPUT}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              To
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => changeTo(e.target.value)}
                className={DATE_INPUT}
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}