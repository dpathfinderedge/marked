import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import {
  hasAnyRule,
  type DayRiskStatus,
  type GoalProgress,
  type LimitMeter,
  type LimitState,
  type RiskRules,
} from "@/lib/calculations";
import { formatDollars, formatSignedDollars } from "@/utils/format";

const BAR_CLASS: Record<LimitState, string> = {
  ok: "bg-text-faint",
  near: "bg-signal-red/70",
  hit: "bg-signal-red",
};

const STATE_TEXT: Record<LimitState, string> = {
  ok: "",
  near: "Close to your limit",
  hit: "Limit reached",
};

interface MeterProps {
  label: string;
  value: string;
  share: number;
  barClass: string;
  note?: string;
  noteClass?: string;
}

function Meter({ label, value, share, barClass, note, noteClass }: MeterProps): JSX.Element {
  const percent = Math.round(Math.min(1, share) * 100);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="truncate font-mono text-xs text-text">{value}</p>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${value}${note ? `. ${note}` : ""}`}
        className="mt-2 h-2 overflow-hidden rounded-full bg-bg-2"
      >
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${percent}%` }} />
      </div>
      <p className={`mt-1.5 min-h-4 text-xs ${noteClass ?? "text-text-faint"}`}>{note ?? ""}</p>
    </div>
  );
}

function lossMeter(meter: LimitMeter): JSX.Element {
  return (
    <Meter
      label="Daily loss limit"
      value={`${formatDollars(meter.used, 0)} of ${formatDollars(meter.limit, 0)} lost`}
      share={meter.share}
      barClass={BAR_CLASS[meter.state]}
      note={STATE_TEXT[meter.state]}
      noteClass={meter.state === "ok" ? undefined : "font-medium text-signal-red"}
    />
  );
}

function countMeter(meter: LimitMeter): JSX.Element {
  return (
    <Meter
      label="Trades today"
      value={`${meter.used} of ${meter.limit}`}
      share={meter.share}
      barClass={BAR_CLASS[meter.state]}
      note={STATE_TEXT[meter.state]}
      noteClass={meter.state === "ok" ? undefined : "font-medium text-signal-red"}
    />
  );
}

function goalMeter(goal: GoalProgress): JSX.Element {
  return (
    <Meter
      label="Monthly goal"
      value={`${formatSignedDollars(goal.pnl, 0)} of ${formatDollars(goal.target, 0)}`}
      share={goal.share}
      barClass="bg-signal-green"
      note={goal.reached ? "Goal reached" : ""}
      noteClass="font-medium text-signal-green"
    />
  );
}

function warningFor(status: DayRiskStatus): string | null {
  const lossHit = status.loss?.state === "hit";
  const countHit = status.count?.state === "hit";
  if (lossHit && countHit) return "You've reached both of your daily limits. Consider stopping for today.";
  if (lossHit) return "You've reached your daily loss limit. Consider stopping for today.";
  if (countHit) return "You've taken as many trades as you planned for today.";
  return null;
}

interface RiskStatusCardProps {
  rules: RiskRules;
  status: DayRiskStatus;
  goal: GoalProgress | null;
}

export function RiskStatusCard({ rules, status, goal }: RiskStatusCardProps): JSX.Element {
  if (!hasAnyRule(rules)) {
    return (
      <Card>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text">Set a daily loss limit</h2>
            <p className="mt-1 text-sm text-text-muted">
              Decide how much you're willing to lose in a day, and this shows how close you are.
            </p>
          </div>
          <Link
            to="/settings"
            className="shrink-0 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-text transition-colors hover:bg-bg-2"
          >
            Set limits
          </Link>
        </div>
      </Card>
    );
  }

  const warning = warningFor(status);
  const meters = [
    status.loss ? lossMeter(status.loss) : null,
    status.count ? countMeter(status.count) : null,
    goal ? goalMeter(goal) : null,
  ].filter((m): m is JSX.Element => m !== null);

  return (
    <Card
      title="Today's limits"
      description="Your day so far, against the lines you set."
      action={
        <Link
          to="/settings"
          className="text-xs font-medium text-text-muted underline underline-offset-4 hover:text-text"
        >
          Edit
        </Link>
      }
      className={warning ? "!border-signal-red/50" : ""}
    >
      {warning ? (
        <p
          role="status"
          className="mb-4 rounded-lg bg-signal-red/10 px-3 py-2 text-sm font-medium text-signal-red"
        >
          {warning}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {meters.map((meter, i) => (
          <div key={i}>{meter}</div>
        ))}
      </div>
    </Card>
  );
}