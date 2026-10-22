import {
  ANNUAL_DISCOUNT_PERCENT,
  intervalLabel,
  type BillingInterval,
} from "@/lib/billing/plans";

interface IntervalToggleProps {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  disabled?: boolean;
}

const OPTIONS: BillingInterval[] = ["monthly", "annual"];

export function IntervalToggle({
  value,
  onChange,
  disabled = false,
}: IntervalToggleProps): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Billing interval"
      className="inline-flex rounded-lg bg-bg-2 p-1"
    >
      {OPTIONS.map((option) => {
        const isSelected = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isSelected
                ? "border-line bg-bg-1 text-text shadow-sm"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {intervalLabel(option)}
            {option === "annual" ? (
              <span className="rounded-full bg-signal-green/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-signal-green">
                Save {ANNUAL_DISCOUNT_PERCENT}%
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}