import { Link } from "react-router-dom";

interface UpgradePromptProps {
  feature: string;
}

export function UpgradePrompt({ feature }: UpgradePromptProps): JSX.Element {
  return (
    <div className="rounded-lg border border-line bg-bg-2 px-4 py-3 text-sm text-text-muted">
      {feature} is a Pro feature.{" "}
      <Link
        to="/billing"
        className="text-signal-red underline underline-offset-4"
      >
        Upgrade
      </Link>{" "}
      to unlock it.
    </div>
  );
}