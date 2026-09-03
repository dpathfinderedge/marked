import { useCallback, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  ToastContext,
  type ToastItem,
  type ToastVariant,
} from "@/context/toast-context";

const TOAST_DURATION_MS = 4000;

export function ToastProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_DURATION_MS);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-lg border border-line bg-bg-1 px-4 py-3 text-sm text-text shadow-lg"
          >
            {toast.variant === "success" ? (
              <CheckCircle2 size={16} className="shrink-0 text-signal-green" />
            ) : (
              <XCircle size={16} className="shrink-0 text-signal-red" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}