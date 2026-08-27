export interface StatCardProps {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}

const TONE_CLASS: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "text-text",
  positive: "text-signal-green",
  negative: "text-signal-red",
};

export function StatCard({
  label,
  value,
  tone = "neutral",
}: StatCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-line bg-bg-1 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-widest text-text-faint">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-medium ${TONE_CLASS[tone]}`}>
        {value}
      </p>
    </div>
  );
}