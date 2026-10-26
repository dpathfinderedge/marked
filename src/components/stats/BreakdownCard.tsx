import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { GroupStats } from "@/lib/calculations";
import { formatSignedDollars } from "@/utils/format";

type Dimension = "pair" | "session" | "tag";

interface BreakdownCardProps {
  byPair: GroupStats[];
  bySession: GroupStats[];
  byTag: GroupStats[];
  className?: string;
}

const OPTIONS: { value: Dimension; label: string }[] = [
  { value: "pair", label: "Pair" },
  { value: "session", label: "Session" },
  { value: "tag", label: "Setup" },
];

const TITLES: Record<Dimension, string> = {
  pair: "pair",
  session: "session",
  tag: "setup tag",
};

export function BreakdownCard({
  byPair,
  bySession,
  byTag,
  className = "",
}: BreakdownCardProps): JSX.Element {
  const [dimension, setDimension] = useState<Dimension>("pair");
  const groups = { pair: byPair, session: bySession, tag: byTag }[dimension];
  const maxAbs = Math.max(1, ...groups.map((g) => Math.abs(g.totalPnl)));

  return (
    <Card
      title="Breakdown"
      description={`Results by ${TITLES[dimension]}`}
      className={className}
      action={
        <SegmentedControl
          label="Break results down by"
          options={OPTIONS}
          value={dimension}
          onChange={setDimension}
        />
      }
    >
      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-muted">
          Nothing to show yet.
        </p>
      ) : (
        <ul className="-mx-1 flex max-h-72 flex-col gap-1 overflow-y-auto px-1">
          {groups.map((group) => {
            const isPositive = group.totalPnl >= 0;
            return (
              <li
                key={group.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-lg px-2 py-2 hover:bg-bg-2/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-text">
                    {group.key || "Untagged"}
                  </p>
                  <p className="text-xs text-text-muted">
                    {group.trades} trade{group.trades === 1 ? "" : "s"}
                    {group.winRate !== null
                      ? ` · ${(group.winRate * 100).toFixed(0)}% win`
                      : ""}
                  </p>
                </div>
                <p
                  className={`font-mono text-sm ${
                    isPositive ? "text-signal-green" : "text-signal-red"
                  }`}
                >
                  {formatSignedDollars(group.totalPnl)}
                </p>
                <div className="col-span-2 h-1 overflow-hidden rounded-full bg-bg-2">
                  <div
                    className={`h-full rounded-full ${
                      isPositive ? "bg-signal-green" : "bg-signal-red"
                    }`}
                    style={{ width: `${(Math.abs(group.totalPnl) / maxAbs) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}