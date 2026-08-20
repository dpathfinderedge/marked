export interface StatCardProps {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}

const TONE_CLASS: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "text-ink",
  positive: "text-green",
  negative: "text-stamp",
};

export function StatCard({
  label,
  value,
  tone = "neutral",
}: StatCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-rule bg-surface px-4 py-3">
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className={`font-mono text-2xl font-medium ${TONE_CLASS[tone]}`}>
        {value}
      </p>
    </div>
  );
}