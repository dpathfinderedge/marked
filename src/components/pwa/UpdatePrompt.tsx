import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/Button";

export function UpdatePrompt(): JSX.Element | null {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-signal-red/10 px-4 py-2.5">
      <p className="font-sans text-xs text-text">
        A new version of Marked is available.
      </p>
      <Button onClick={() => void updateServiceWorker(true)}>Reload</Button>
    </div>
  );
}