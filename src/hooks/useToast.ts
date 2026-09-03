import { useContext } from "react";
import { ToastContext, type ToastContextValue } from "@/context/toast-context";

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error("useToast must be used within a <ToastProvider>.");
  }

  return context;
}