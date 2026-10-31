import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import {
  MIN_ADHERENCE_SAMPLE,
  hasEnoughToCompare,
  type Adherence,
  type AdherenceGroup,
} from "@/lib/calculations";
import { formatDollars, formatSignedDollars } from "@/utils/format";

function Group({ title, group }: { title: string; group: AdherenceGroup | null }): JSX.Element {
  return (
    <div className="min-w-0">
      <p className="text-xs text-text-muted">{title}</p>
      {group ? (
        <>
          <p
            className={`mt-1 font-mono text-2xl font-semibold tracking-tight ${
              group.expectancy >= 0 ? "text-signal-green" : "text-signal-red"
            }`}
          >
            {formatSignedDollars(group.expectancy, 0)}
            <span className="ml-1.5 text-sm font-normal text-text-muted">per trade</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {group.trades} trade{group.trades === 1 ? "" : "s"} ·{" "}
            {(group.winRate * 100).toFixed(0)}% win rate
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-text-faint">No trades yet</p>
      )}
    </div>
  );
}

export function AdherenceCard({ adherence }: { adherence: Adherence | null }): JSX.Element {
  if (adherence === null) {
    return (
      <Card title="Do your rules pay?">
        <p className="text-sm text-text-muted">
          Write a pre-trade checklist, tick it as you log trades, and this shows whether following
          your rules makes you money.
        </p>
        <Link
          to="/settings"
          className="mt-3 inline-block text-sm font-medium text-signal-red underline underline-offset-4"
        >
          Set up your checklist
        </Link>
      </Card>
    );
  }

  const enough = hasEnoughToCompare(adherence);
  const gap =
    enough && adherence.followed && adherence.skipped
      ? adherence.followed.expectancy - adherence.skipped.expectancy
      : null;

  return (
    <Card title="Do your rules pay?" description="Trades where you ticked every rule, against trades where you skipped one.">
      <div className="grid gap-5 sm:grid-cols-2">
        <Group title="Followed every rule" group={adherence.followed} />
        <Group title="Skipped at least one" group={adherence.skipped} />
      </div>

      <p className="mt-4 text-sm text-text-muted">
        {gap !== null ? (
          gap > 0 ? (
            <>
              Following your rules is worth about{" "}
              <span className="font-medium text-signal-green">{formatSignedDollars(gap, 0)}</span>{" "}
              more on each trade.
            </>
          ) : gap < 0 ? (
            <>
              Your trades without every rule ticked paid about{" "}
              <span className="font-medium text-signal-red">{formatDollars(-gap, 0)}</span>{" "}
              more per trade. Worth asking whether those rules are the right ones.
            </>
          ) : (
            "Both groups pay the same per trade."
          )
        ) : (
          `Once you have at least ${MIN_ADHERENCE_SAMPLE} trades in each group, this compares them.`
        )}
      </p>
      {adherence.unused > 0 ? (
        <p className="mt-1.5 text-xs text-text-faint">
          {adherence.unused} trade{adherence.unused === 1 ? " was" : "s were"} logged without a
          checklist and aren't counted here.
        </p>
      ) : null}
    </Card>
  );
}