import { useSubscription } from "@/hooks/useSubscription";

interface PlanBadgeProps {
  className?: string;
}

export function PlanBadge({ className = "" }: PlanBadgeProps): JSX.Element | null {
  const { status, isPro, isLoading } = useSubscription();

  if (isLoading) return null;

  let label = "Free";
  let tone = "bg-bg-2 text-text-muted";

  if (isPro) {
    label = "Pro";
    tone = "bg-signal-green/15 text-signal-green";
  } else if (status === "past_due") {
    label = "Past due";
    tone = "bg-signal-red/15 text-signal-red";
  }

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone} ${className}`}
    >
      {label}
    </span>
  );
}