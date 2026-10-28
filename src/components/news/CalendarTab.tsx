import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  ErrorState,
  ImpactBars,
  LoadingRows,
  SourceNote,
  StaleNotice,
} from "@/components/news/parts";
import { useMarketNews } from "@/hooks/useMarketNews";
import { useStoredState } from "@/hooks/useStoredState";
import {
  IMPACT_FILTERS,
  NEWS_CURRENCIES,
  filterEvents,
  findNextEvent,
  formatDayHeading,
  formatEventTime,
  groupEventsByDay,
  hasHappened,
  parseCalendarPayload,
  type CalendarEvent,
  type ImpactFilter,
} from "@/lib/news/news";

function readImpact(value: string): ImpactFilter {
  return value === "high" || value === "all" ? value : "medium";
}

function readCurrencies(value: string): string[] {
  return value.split(",").filter((c) => (NEWS_CURRENCIES as readonly string[]).includes(c));
}

function Figure({ label, value, isActual }: { label: string; value: string | null; isActual?: boolean }): JSX.Element {
  return (
    <div className="flex items-baseline gap-1.5 sm:block sm:text-right">
      <span className="text-[11px] text-text-faint sm:hidden">{label}</span>
      <span
        className={`font-mono text-sm ${
          value === null ? "text-text-faint" : isActual ? "font-semibold text-text" : "text-text-muted"
        }`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

const ROW_GRID =
  "sm:grid sm:grid-cols-[4rem_3.25rem_2.25rem_minmax(0,1fr)_5.5rem_5.5rem_5.5rem] sm:items-center sm:gap-3";

function EventRow({
  event,
  isPast,
  isNext,
}: {
  event: CalendarEvent;
  isPast: boolean;
  isNext: boolean;
}): JSX.Element {
  return (
    <li
      className={`px-4 py-3 ${ROW_GRID} ${isPast ? "opacity-60" : ""} ${
        isNext ? "bg-signal-red/5" : ""
      }`}
    >
      <div className="flex items-center gap-3 sm:contents">
        <span className="font-mono text-sm text-text">{formatEventTime(event)}</span>
        <span className="font-mono text-xs font-semibold text-text-muted">
          {event.currency ?? event.country}
        </span>
        <ImpactBars impact={event.impact} />
        {isNext ? (
          <span className="ml-auto rounded-full bg-signal-red px-2 py-0.5 text-[11px] font-semibold text-white sm:hidden">
            Next
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 flex items-center gap-2 text-sm text-text sm:mt-0">
        <span className="min-w-0">{event.title}</span>
        {isNext ? (
          <span className="hidden shrink-0 rounded-full bg-signal-red px-2 py-0.5 text-[11px] font-semibold text-white sm:inline">
            Next
          </span>
        ) : null}
      </p>
      <div className="mt-2 flex gap-5 sm:contents">
        <Figure label="Actual" value={event.actual} isActual />
        <Figure label="Forecast" value={event.forecast} />
        <Figure label="Previous" value={event.previous} />
      </div>
    </li>
  );
}

export function CalendarTab(): JSX.Element {
  const { data, isLoading, error, reload } = useMarketNews("calendar", parseCalendarPayload);
  const [impactValue, setImpactValue] = useStoredState("marked-news-impact", "medium");
  const [currencyValue, setCurrencyValue] = useStoredState("marked-news-currencies", "");

  const impact = readImpact(impactValue);
  const currencies = readCurrencies(currencyValue);
  const now = new Date();

  const days = useMemo(
    () => (data ? groupEventsByDay(filterEvents(data.items, impact, currencies)) : []),
    [data, impact, currencyValue],
  );
  const next = data ? findNextEvent(filterEvents(data.items, impact, currencies), now) : null;

  const toggleCurrency = (code: string): void => {
    const updated = currencies.includes(code)
      ? currencies.filter((c) => c !== code)
      : [...currencies, code];
    setCurrencyValue(updated.join(","));
  };

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <SegmentedControl
          label="Impact"
          options={IMPACT_FILTERS}
          value={impact}
          onChange={setImpactValue}
        />
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Currencies">
          <button
            type="button"
            aria-pressed={currencies.length === 0}
            onClick={() => setCurrencyValue("")}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              currencies.length === 0
                ? "border-text bg-text text-bg-0"
                : "border-line text-text-muted hover:text-text"
            }`}
          >
            All
          </button>
          {NEWS_CURRENCIES.map((code) => {
            const isOn = currencies.includes(code);
            return (
              <button
                key={code}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggleCurrency(code)}
                className={`rounded-full border px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                  isOn
                    ? "border-text bg-text text-bg-0"
                    : "border-line text-text-muted hover:text-text"
                }`}
              >
                {code}
              </button>
            );
          })}
        </div>
      </div>

      <Card className="!p-0">
        {isLoading && !data ? (
          <div className="p-5">
            <LoadingRows />
          </div>
        ) : error && !data ? (
          <div className="px-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : days.length === 0 ? (
          <div className="flex flex-col items-start gap-3 px-5 py-8">
            <p className="text-sm text-text-muted">
              No events match these filters for the next two weeks.
            </p>
            <button
              type="button"
              onClick={() => {
                setImpactValue("all");
                setCurrencyValue("");
              }}
              className="text-sm font-medium text-signal-red underline underline-offset-4"
            >
              Show every event
            </button>
          </div>
        ) : (
          <div>
            {data?.stale ? (
              <div className="px-4 pt-4">
                <StaleNotice />
              </div>
            ) : null}
            <div
              className={`hidden border-b border-line px-4 py-2 text-xs text-text-faint ${ROW_GRID}`}
            >
              <span>Time</span>
              <span>Currency</span>
              <span>Impact</span>
              <span>Event</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Forecast</span>
              <span className="text-right">Previous</span>
            </div>
            {days.map(({ day, events }) => (
              <section key={day} aria-label={formatDayHeading(day, now)}>
                <h3 className="border-y border-line bg-bg-2/50 px-4 py-2 text-xs font-semibold text-text first:border-t-0">
                  {formatDayHeading(day, now)}
                </h3>
                <ul className="divide-y divide-line">
                  {events.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      isPast={hasHappened(event, now)}
                      isNext={next?.id === event.id}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>

      <SourceNote>
        Times are shown in your time zone ({timeZone}). Calendar data from{" "}
        <a
          href="https://www.financecalendar.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-text"
        >
          Finance Calendar
        </a>
        . Dates and values can change, so check the official release before you trade on it.
      </SourceNote>
    </div>
  );
}