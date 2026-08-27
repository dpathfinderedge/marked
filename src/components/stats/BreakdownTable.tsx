import type { GroupStats } from "@/lib/calculations";

interface BreakdownTableProps {
  title: string;
  groups: GroupStats[];
}

function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "−";
  return `${sign}${Math.abs(pnl).toFixed(2)}`;
}

export function BreakdownTable({
  title,
  groups,
}: BreakdownTableProps): JSX.Element {
  return (
    <div className="rounded-xl border border-line bg-bg-1">
      <h3 className="border-b border-line px-4 py-3 font-mono text-xs uppercase tracking-wider text-text-muted">
        {title}
      </h3>
      {groups.length === 0 ? (
        <p className="px-4 py-3 font-sans text-sm text-text-muted">
          Nothing to show yet.
        </p>
      ) : (
        groups.map((group) => (
          <div
            key={group.key}
            className="flex items-center justify-between border-b border-line px-4 py-2.5 font-mono text-sm last:border-b-0"
          >
            <div className="flex flex-col">
              <span className="text-text">{group.key}</span>
              <span className="text-xs text-text-muted">
                {group.trades} trade{group.trades === 1 ? "" : "s"}
                {group.winRate !== null
                  ? ` · ${(group.winRate * 100).toFixed(0)}% win`
                  : ""}
              </span>
            </div>
            <span
              className={group.totalPnl >= 0 ? "text-signal-green" : "text-signal-red"}
            >
              {formatPnl(group.totalPnl)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}