import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner(): JSX.Element | null {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="border-b border-line bg-signal-red px-4 py-2 text-center font-mono text-xs text-paper">
      You're offline. Changes won't sync until you're back online.
    </div>
  );
}