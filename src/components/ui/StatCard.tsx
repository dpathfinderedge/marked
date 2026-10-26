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
    <div className="rounded-lg bg-bg-2/60 px-3.5 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-1 font-mono text-xl font-medium ${TONE_CLASS[tone]}`}>
        {value}
      </p>
    </div>
  );
}