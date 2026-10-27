import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { DateRangePicker } from "@/components/trades/DateRangePicker";
import { countActiveFilters, EMPTY_FILTERS, type TradeFilters } from "@/lib/calculations";

interface TradesToolbarProps {
  filters: TradeFilters;
  onChange: (patch: Partial<TradeFilters>) => void;
  onClear: () => void;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps): JSX.Element {
  const isActive = value !== "all";
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 rounded-lg border bg-bg-1 px-2.5 text-sm outline-none transition-colors hover:bg-bg-2 focus:border-line-strong ${
        isActive ? "border-line-strong text-text" : "border-line text-text-muted"
      }`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function TradesToolbar({ filters, onChange, onClear }: TradesToolbarProps): JSX.Element {
  const [showFilters, setShowFilters] = useState(false);
  const activeCount = countActiveFilters(filters);
  const otherFilters = countActiveFilters({ ...filters, search: EMPTY_FILTERS.search });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search pair, setup or notes"
            aria-label="Search trades"
            className="h-9 w-full rounded-lg border border-line bg-bg-1 pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-faint focus:border-line-strong"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((open) => !open)}
          aria-expanded={showFilters}
          className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors hover:bg-bg-2 sm:hidden ${
            otherFilters > 0 ? "border-line-strong text-text" : "border-line text-text-muted"
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters{otherFilters > 0 ? ` (${otherFilters})` : ""}
        </button>
      </div>

      <div className={`${showFilters ? "flex" : "hidden"} flex-wrap items-center gap-2 sm:flex`}>
        <DateRangePicker
          from={filters.from}
          to={filters.to}
          onChange={(from, to) => onChange({ from, to })}
        />
        <FilterSelect
          label="Market"
          value={filters.market}
          onChange={(value) => onChange({ market: value as TradeFilters["market"] })}
          options={[
            { value: "all", label: "All markets" },
            { value: "forex", label: "Forex" },
            { value: "crypto", label: "Crypto" },
          ]}
        />
        <FilterSelect
          label="Direction"
          value={filters.direction}
          onChange={(value) => onChange({ direction: value as TradeFilters["direction"] })}
          options={[
            { value: "all", label: "Long & short" },
            { value: "long", label: "Long" },
            { value: "short", label: "Short" },
          ]}
        />
        <FilterSelect
          label="Result"
          value={filters.result}
          onChange={(value) => onChange({ result: value as TradeFilters["result"] })}
          options={[
            { value: "all", label: "Wins & losses" },
            { value: "win", label: "Wins" },
            { value: "loss", label: "Losses" },
          ]}
        />
        <FilterSelect
          label="Session"
          value={filters.session}
          onChange={(value) => onChange({ session: value as TradeFilters["session"] })}
          options={[
            { value: "all", label: "All sessions" },
            { value: "Asian", label: "Asian" },
            { value: "London", label: "London" },
            { value: "New York", label: "New York" },
            { value: "Overlap", label: "Overlap" },
          ]}
        />

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-text-muted transition-colors hover:bg-bg-2 hover:text-text"
          >
            <X size={14} />
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}