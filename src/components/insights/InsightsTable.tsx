import { MIN_SAMPLE, type InsightRow, type InsightSortKey } from "@/lib/calculations";
import { formatDollars, formatSignedDollars } from "@/utils/format";

function percent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function ratio(value: number | null): string {
  if (value === null) return "—";
  if (!Number.isFinite(value)) return "∞";
  return value.toFixed(2);
}

function averageR(value: number | null): string {
  return value === null ? "—" : `${value >= 0 ? "" : "−"}${Math.abs(value).toFixed(2)}R`;
}

const tone = (value: number): string =>
  value > 0 ? "text-signal-green" : value < 0 ? "text-signal-red" : "text-text";

const SORTS: { key: InsightSortKey; label: string }[] = [
  { key: "trades", label: "Trades" },
  { key: "winRate", label: "Win rate" },
  { key: "expectancy", label: "Per trade" },
  { key: "netPnl", label: "Net P&L" },
];

const COLUMNS =
  "grid grid-cols-[minmax(0,1.6fr)_4.5rem_5rem_5rem_5.5rem_5rem_minmax(0,1.4fr)] items-center gap-3";

interface InsightsTableProps {
  rows: InsightRow[];
  sortBy: InsightSortKey;
  onSortChange: (key: InsightSortKey) => void;
}

function SmallSample({ trades }: { trades: number }): JSX.Element | null {
  if (trades >= MIN_SAMPLE) return null;
  return (
    <span className="ml-2 text-xs text-text-faint" title={`Fewer than ${MIN_SAMPLE} trades, so treat this loosely.`}>
      small sample
    </span>
  );
}

function NetBar({ value, max }: { value: number; max: number }): JSX.Element {
  const width = max === 0 ? 0 : Math.min(50, (Math.abs(value) / max) * 50);
  return (
    <div className="relative h-1.5 w-full rounded-full bg-bg-2" aria-hidden="true">
      <div className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
      <div
        className={`absolute inset-y-0 rounded-full ${value >= 0 ? "bg-signal-green" : "bg-signal-red"}`}
        style={value >= 0 ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }}
      />
    </div>
  );
}

export function InsightsTable({ rows, sortBy, onSortChange }: InsightsTableProps): JSX.Element {
  const maxNet = rows.reduce((max, r) => Math.max(max, Math.abs(r.netPnl)), 0);

  return (
    <div>
      <div className="hidden md:block">
        <div className={`${COLUMNS} border-b border-line px-5 py-2 text-xs text-text-faint`}>
          <span>Name</span>
          {SORTS.slice(0, 2).map((s) => (
            <SortHeader key={s.key} sort={s} active={sortBy === s.key} onSortChange={onSortChange} />
          ))}
          <span className="text-right">Avg R</span>
          <SortHeader sort={SORTS[2]!} active={sortBy === "expectancy"} onSortChange={onSortChange} />
          <span className="text-right">Profit factor</span>
          <SortHeader sort={SORTS[3]!} active={sortBy === "netPnl"} onSortChange={onSortChange} />
        </div>
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.key} className={`${COLUMNS} px-5 py-3.5`}>
              <span className="min-w-0 truncate text-sm font-medium text-text">
                {row.label}
                <SmallSample trades={row.trades} />
              </span>
              <span className="text-right font-mono text-sm text-text">{row.trades}</span>
              <span className="text-right font-mono text-sm text-text">{percent(row.winRate)}</span>
              <span className={`text-right font-mono text-sm ${row.avgR === null ? "text-text-faint" : tone(row.avgR)}`}>
                {averageR(row.avgR)}
              </span>
              <span className={`text-right font-mono text-sm ${tone(row.expectancy)}`}>
                {formatSignedDollars(row.expectancy, 0)}
              </span>
              <span className="text-right font-mono text-sm text-text">{ratio(row.profitFactor)}</span>
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className={`text-right font-mono text-sm font-semibold ${tone(row.netPnl)}`}>
                  {formatSignedDollars(row.netPnl, 0)}
                </span>
                <NetBar value={row.netPnl} max={maxNet} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="md:hidden">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-3">
          <span className="text-xs text-text-faint">Sort by</span>
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={sortBy === s.key}
              onClick={() => onSortChange(s.key)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                sortBy === s.key ? "border-text bg-text text-bg-0" : "border-line text-text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.key} className="px-4 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-text">
                  {row.label}
                  <SmallSample trades={row.trades} />
                </span>
                <span className={`font-mono text-base font-semibold ${tone(row.netPnl)}`}>
                  {formatSignedDollars(row.netPnl, 0)}
                </span>
              </div>
              <div className="mt-2">
                <NetBar value={row.netPnl} max={maxNet} />
              </div>
              <dl className="mt-3 grid grid-cols-4 gap-2 text-xs">
                <Stat label="Trades" value={String(row.trades)} />
                <Stat label="Win rate" value={percent(row.winRate)} />
                <Stat label="Avg R" value={averageR(row.avgR)} />
                <Stat label="Per trade" value={formatDollars(row.expectancy, 0)} />
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SortHeader({
  sort,
  active,
  onSortChange,
}: {
  sort: { key: InsightSortKey; label: string };
  active: boolean;
  onSortChange: (key: InsightSortKey) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSortChange(sort.key)}
      aria-pressed={active}
      className={`text-right transition-colors hover:text-text ${active ? "font-semibold text-text" : ""}`}
    >
      {sort.label}
      {active ? " ↓" : ""}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt className="text-text-faint">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm text-text">{value}</dd>
    </div>
  );
}