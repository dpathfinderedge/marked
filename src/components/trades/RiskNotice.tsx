import { formatDollars } from "@/utils/format";
import type { DayRiskStatus } from "@/lib/calculations";

export function RiskNotice({ status }: { status: DayRiskStatus }): JSX.Element | null {
  const lines: string[] = [];

  if (status.loss && status.loss.state !== "ok") {
    lines.push(
      status.loss.state === "hit"
        ? `You've reached your daily loss limit (${formatDollars(status.loss.used, 0)} lost of ${formatDollars(status.loss.limit, 0)}).`
        : `You're close to your daily loss limit (${formatDollars(status.loss.used, 0)} lost of ${formatDollars(status.loss.limit, 0)}).`,
    );
  }
  if (status.count && status.count.state !== "ok") {
    lines.push(
      status.count.state === "hit"
        ? `You've taken ${status.count.used} trades today, your limit is ${status.count.limit}.`
        : `You've taken ${status.count.used} of ${status.count.limit} trades for today.`,
    );
  }
  if (lines.length === 0) return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-signal-red/40 bg-signal-red/10 px-3 py-2.5 text-sm text-signal-red"
    >
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}