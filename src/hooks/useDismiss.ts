import { useEffect, type RefObject } from "react";

export function useDismiss(
  ref: RefObject<HTMLElement>,
  isActive: boolean,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!isActive) return;

    const handlePointer = (event: MouseEvent | TouchEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onDismiss();
      }
    };
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onDismiss();
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ref, isActive, onDismiss]);
}