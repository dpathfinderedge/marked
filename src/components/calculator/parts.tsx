import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Input, type InputProps } from "@/components/ui/Input";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { useSubscription } from "@/hooks/useSubscription";
import { quoteCurrency } from "@/lib/calculations";
import { fetchFxRate, FxRateError } from "@/lib/fx/fetchFxRate";

interface NumberFieldProps extends Omit<InputProps, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
}

export function NumberField({ value, onChange, hint, ...rest }: NumberFieldProps): JSX.Element {
  return (
    <div>
      <Input
        type="number"
        step="any"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {hint ? <p className="mt-1.5 text-xs text-text-faint">{hint}</p> : null}
    </div>
  );
}

export function QuoteRateField({
  pair,
  value,
  onChange,
}: {
  pair: string;
  value: string;
  onChange: (value: string) => void;
}): JSX.Element {
  const { isPro } = useSubscription();
  const quote = quoteCurrency(pair);
  const [isLooking, setIsLooking] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const lookUp = async (): Promise<void> => {
    setIsLooking(true);
    setLookupMessage(null);
    try {
      const { rate, date } = await fetchFxRate(quote, "USD");
      onChange(String(Number(rate.toFixed(5))));
      setLookupMessage(`${quote}/USD ${rate.toFixed(4)} (ECB rate, ${date})`);
    } catch (err) {
      setLookupMessage(err instanceof FxRateError ? err.message : "Couldn't fetch a rate.");
    } finally {
      setIsLooking(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <NumberField
        label={`${quote} to USD rate`}
        placeholder="e.g. 1.25"
        value={value}
        onChange={onChange}
        hint={`${pair} isn't quoted in dollars, so a pip needs this rate to be priced in $.`}
      />
      {isPro ? (
        <button
          type="button"
          onClick={() => void lookUp()}
          disabled={isLooking}
          className="self-start text-xs font-medium text-signal-red underline underline-offset-4 disabled:opacity-50"
        >
          {isLooking ? "Looking up rate…" : "Look up live rate"}
        </button>
      ) : (
        <UpgradePrompt feature="Live rate lookup" />
      )}
      {lookupMessage ? <p className="text-xs text-text-muted">{lookupMessage}</p> : null}
    </div>
  );
}

export interface ResultRow {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}

interface ResultCardProps {
  primary: { label: string; value: string; hint?: string } | null;
  rows?: ResultRow[];
  warnings?: string[];
  notes?: string[];
  message?: string;
  children?: ReactNode;
}

export function ResultCard({
  primary,
  rows = [],
  warnings = [],
  notes = [],
  message,
  children,
}: ResultCardProps): JSX.Element {
  return (
    <Card title="Result" className="lg:sticky lg:top-7">
      {primary ? (
        <>
          <p className="text-xs text-text-muted">{primary.label}</p>
          <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-text">
            {primary.value}
          </p>
          {primary.hint ? (
            <p className="mt-1.5 text-sm text-text-muted">{primary.hint}</p>
          ) : null}

          {children ? <div className="mt-5">{children}</div> : null}

          {rows.length > 0 ? (
            <dl className="mt-5 divide-y divide-line border-t border-line">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-sm text-text-muted">{row.label}</dt>
                  <dd
                    className={`text-right font-mono text-sm ${
                      row.tone === "positive"
                        ? "text-signal-green"
                        : row.tone === "negative"
                          ? "text-signal-red"
                          : "text-text"
                    }`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {warnings.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-2">
              {warnings.map((warning) => (
                <li
                  key={warning}
                  className="rounded-lg border border-signal-red/30 bg-signal-red/5 px-3 py-2.5 text-sm text-text"
                >
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}

          {notes.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-1.5">
              {notes.map((note) => (
                <li key={note} className="text-xs text-text-faint">
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="py-10 text-sm text-text-muted">{message}</p>
      )}
    </Card>
  );
}

export function ToolLayout({
  inputs,
  result,
}: {
  inputs: ReactNode;
  result: ReactNode;
}): JSX.Element {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] xl:gap-8">
      <Card>
        <div className="flex flex-col gap-4">{inputs}</div>
      </Card>
      {result}
    </div>
  );
}