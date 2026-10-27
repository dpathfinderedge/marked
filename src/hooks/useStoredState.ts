import { useCallback, useState } from "react";

export function useStoredState(
  key: string,
  initial: string,
): [string, (value: string) => void] {
  const [value, setValue] = useState<string>(() => {
    try {
      return window.localStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next: string) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        //
      }
    },
    [key],
  );

  return [value, update];
}