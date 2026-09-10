import { RefreshCw } from "lucide-react";
import { Stamp } from "@/components/ui/Stamp";
import { Button } from "@/components/ui/Button";

interface ErrorFallbackProps {
  resetError: () => void;
}

export function ErrorFallback({ resetError }: ErrorFallbackProps): JSX.Element {
  const handleReload = (): void => {
    resetError();
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-0 px-6 text-center">
      <Stamp size={32} className="text-signal-red" />
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text">
          Something went wrong.
        </h1>
        <p className="mt-2 max-w-sm text-sm text-text-muted">
          This has been reported automatically. Try reloading — if it keeps
          happening, let us know.
        </p>
      </div>
      <Button onClick={handleReload}>
        <span className="flex items-center gap-1.5">
          <RefreshCw size={14} />
          Reload
        </span>
      </Button>
    </div>
  );
}