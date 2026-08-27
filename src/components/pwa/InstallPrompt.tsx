import { useState } from "react";
import { Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Button } from "@/components/ui/Button";

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return isIos && !isStandalone;
}

export function InstallPrompt(): JSX.Element | null {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  const showIosHint = isIosSafari() && !isInstalled && !canInstall;

  if (dismissed || isInstalled || (!canInstall && !showIosHint)) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-bg-1 px-4 py-2.5">
      <p className="font-sans text-xs text-text">
        {showIosHint
          ? 'Install Marked: tap Share, then "Add to Home Screen."'
          : "Install Marked for quicker, offline-ready access."}
      </p>
      <div className="flex shrink-0 items-center gap-3">
        {canInstall ? (
          <Button variant="secondary" onClick={() => void promptInstall()}>
            <span className="flex items-center gap-1.5">
              <Download size={14} />
              Install
            </span>
          </Button>
        ) : null}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="font-mono text-xs text-text-muted underline underline-offset-4"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}