import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Impact } from "@/lib/news/news";

const BARS: Record<Impact, number> = { low: 1, medium: 2, high: 3 };

export function ImpactBars({ impact }: { impact: Impact }): JSX.Element {
  const filled = BARS[impact];
  return (
    <span
      role="img"
      aria-label={`${impact} impact`}
      title={`${impact[0]!.toUpperCase()}${impact.slice(1)} impact`}
      className="inline-flex items-end gap-0.5"
    >
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`w-1 rounded-sm ${n <= filled ? "bg-signal-red" : "bg-line-strong"}`}
          style={{ height: `${4 + n * 3}px` }}
        />
      ))}
    </span>
  );
}

export function LoadingRows({ count = 8 }: { count?: number }): JSX.Element {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-3 py-6">
      <p className="text-sm text-text">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function StaleNotice(): JSX.Element {
  return (
    <p className="mb-4 rounded-lg border border-line bg-bg-2/60 px-3 py-2 text-xs text-text-muted">
      The source isn't responding, so this is the last copy we saved. It may be out of date.
    </p>
  );
}

export function SourceNote({ children }: { children: ReactNode }): JSX.Element {
  return <p className="mt-5 text-xs text-text-faint">{children}</p>;
}