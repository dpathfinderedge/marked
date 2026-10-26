import type { ReactNode } from "react";

interface KpiTileProps {
  label: string;
  value: string;
  sub?: ReactNode;
  tone?: "neutral" | "positive" | "negative";
}

const TONE_CLASS: Record<NonNullable<KpiTileProps["tone"]>, string> = {
  neutral: "text-text",
  positive: "text-signal-green",
  negative: "text-signal-red",
};

export function KpiTile({
  label,
  value,
  sub,
  tone = "neutral",
}: KpiTileProps): JSX.Element {
  return (
    <div className="rounded-xl border border-line bg-bg-1 p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p
        className={`mt-1.5 whitespace-nowrap font-mono text-xl font-semibold tracking-tight sm:text-2xl ${TONE_CLASS[tone]}`}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 truncate text-xs text-text-faint">{sub}</p> : null}
    </div>
  );
}