import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

export function PastDueBanner(): JSX.Element | null {
  const { status, isLoading } = useSubscription();
  if (isLoading || status !== "past_due") return null;

  return (
    <div
      role="alert"
      className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-signal-red/40 bg-signal-red/10 px-4 py-3 text-sm"
    >
      <span className="text-text">
        Your last payment failed, so Pro is paused.
      </span>
      <Link
        to="/billing"
        className="font-semibold text-signal-red underline-offset-2 hover:underline"
      >
        Update your payment method
      </Link>
    </div>
  );
}