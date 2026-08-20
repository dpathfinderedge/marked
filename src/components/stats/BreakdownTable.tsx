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
    <div className="rounded-xl border border-rule bg-surface">
      <h3 className="border-b border-rule px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted">
        {title}
      </h3>
      {groups.length === 0 ? (
        <p className="px-4 py-3 font-sans text-sm text-muted">
          Nothing to show yet.
        </p>
      ) : (
        groups.map((group) => (
          <div
            key={group.key}
            className="flex items-center justify-between border-b border-rule px-4 py-2.5 font-mono text-sm last:border-b-0"
          >
            <div className="flex flex-col">
              <span className="text-ink">{group.key}</span>
              <span className="text-xs text-muted">
                {group.trades} trade{group.trades === 1 ? "" : "s"}
                {group.winRate !== null
                  ? ` · ${(group.winRate * 100).toFixed(0)}% win`
                  : ""}
              </span>
            </div>
            <span
              className={group.totalPnl >= 0 ? "text-green" : "text-stamp"}
            >
              {formatPnl(group.totalPnl)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}