import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, ChevronsUpDown, FileText } from "lucide-react";
import { Stamp } from "@/components/ui/Stamp";
import type { SortKey, SortState } from "@/lib/calculations";
import type { Trade } from "@/types/trade";
import { formatLongDate, formatShortDate } from "@/utils/dates";
import { formatSignedDollars } from "@/utils/format";

interface TradesTableProps {
  trades: Trade[];
  sort: SortState;
  onSort: (key: SortKey) => void;
  flaggedTradeIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}): JSX.Element {
  const isActive = sort.key === sortKey;
  const Icon = !isActive ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={isActive ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      className={`px-3 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-text ${
          isActive ? "text-text" : ""
        }`}
      >
        {label}
        <Icon size={12} className={isActive ? "" : "text-text-faint"} />
      </button>
    </th>
  );
}

function DirectionIcon({ trade }: { trade: Trade }): JSX.Element {
  const isLong = trade.direction === "long";
  return (
    <span
      className={`flex shrink-0 items-center ${isLong ? "text-signal-green" : "text-signal-red"}`}
      title={isLong ? "Long" : "Short"}
    >
      {isLong ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      <span className="sr-only">{isLong ? "Long" : "Short"}</span>
    </span>
  );
}

function Markers({ trade, isFlagged }: { trade: Trade; isFlagged: boolean }): JSX.Element {
  return (
    <>
      {isFlagged ? (
        <span title="Flagged: follows a losing streak" className="flex shrink-0">
          <Stamp size={13} className="text-signal-red" />
          <span className="sr-only">Flagged</span>
        </span>
      ) : null}
      {trade.notes ? (
        <span title="Has notes" className="flex shrink-0 text-text-faint">
          <FileText size={13} />
          <span className="sr-only">Has notes</span>
        </span>
      ) : null}
    </>
  );
}

export function TradesTable({
  trades,
  sort,
  onSort,
  flaggedTradeIds,
  selectedId,
  onSelect,
}: TradesTableProps): JSX.Element {
  return (
    <>
      <table className="hidden w-full table-fixed text-sm md:table">
        <colgroup>
          <col className="w-36" />
          <col />
          <col className="w-32" />
          <col className="w-40" />
          <col className="w-20" />
          <col className="w-32" />
        </colgroup>
        <thead>
          <tr className="border-b border-line text-xs text-text-muted">
            <SortHeader label="Date" sortKey="date" sort={sort} onSort={onSort} />
            <SortHeader label="Pair" sortKey="pair" sort={sort} onSort={onSort} />
            <th scope="col" className="px-3 py-2.5 text-left font-medium">Session</th>
            <th scope="col" className="px-3 py-2.5 text-left font-medium">Setup</th>
            <SortHeader label="R" sortKey="r" sort={sort} onSort={onSort} align="right" />
            <SortHeader label="P&L" sortKey="pnl" sort={sort} onSort={onSort} align="right" />
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const isFlagged = flaggedTradeIds.has(trade.id);
            return (
              <tr
                key={trade.id}
                tabIndex={0}
                aria-label={`${trade.pair}, ${formatLongDate(trade.date)}, ${formatSignedDollars(trade.pnl)}. Open details`}
                onClick={() => onSelect(trade.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(trade.id);
                  }
                }}
                className={`cursor-pointer border-b border-line outline-none transition-colors last:border-b-0 hover:bg-bg-2/60 focus-visible:bg-bg-2/60 ${
                  selectedId === trade.id ? "bg-bg-2/60" : ""
                }`}
              >
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-text-muted">
                  {formatLongDate(trade.date)}
                </td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-mono text-text">{trade.pair}</span>
                    <DirectionIcon trade={trade} />
                    <Markers trade={trade} isFlagged={isFlagged} />
                  </span>
                </td>
                <td className="truncate px-3 py-3 text-xs text-text-muted">{trade.session}</td>
                <td className="truncate px-3 py-3 text-xs text-text-muted">{trade.tag || "—"}</td>
                <td className="px-3 py-3 text-right font-mono text-xs text-text-muted">
                  {trade.rMultiple !== null ? `${trade.rMultiple.toFixed(1)}R` : "—"}
                </td>
                <td
                  className={`px-3 py-3 text-right font-mono ${
                    trade.pnl >= 0 ? "text-signal-green" : "text-signal-red"
                  }`}
                >
                  {formatSignedDollars(trade.pnl)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-line md:hidden">
        {trades.map((trade) => {
          const isFlagged = flaggedTradeIds.has(trade.id);
          const details = [formatShortDate(trade.date), trade.session, trade.tag]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={trade.id}>
              <button
                type="button"
                onClick={() => onSelect(trade.id)}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 text-left transition-colors hover:bg-bg-2/60 ${
                  selectedId === trade.id ? "bg-bg-2/60" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-mono text-sm text-text">{trade.pair}</span>
                    <DirectionIcon trade={trade} />
                    <Markers trade={trade} isFlagged={isFlagged} />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-text-muted">{details}</span>
                </span>
                <span className="text-right">
                  <span
                    className={`block font-mono text-sm ${
                      trade.pnl >= 0 ? "text-signal-green" : "text-signal-red"
                    }`}
                  >
                    {formatSignedDollars(trade.pnl)}
                  </span>
                  {trade.rMultiple !== null ? (
                    <span className="block font-mono text-xs text-text-muted">
                      {trade.rMultiple.toFixed(1)}R
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}