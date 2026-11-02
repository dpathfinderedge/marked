import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  IDLE,
  isTextEntry,
  resolveKeyPress,
  type ShortcutAction,
  type ShortcutState,
} from "@/lib/shortcuts/shortcuts";

const GO_TIMEOUT_MS = 1500;

const SEARCH_SELECTOR = 'input[aria-label="Search trades"]';

function focusSearch(): void {
  let frames = 0;
  const tryFocus = (): void => {
    const input = document.querySelector<HTMLInputElement>(SEARCH_SELECTOR);
    if (input) {
      input.focus();
      input.select();
      return;
    }
    if (frames++ < 40) requestAnimationFrame(tryFocus);
  };
  tryFocus();
}

export function useKeyboardShortcuts(onHelp: () => void): void {
  const navigate = useNavigate();
  const stateRef = useRef<ShortcutState>(IDLE);
  const timerRef = useRef<number | undefined>(undefined);
  const onHelpRef = useRef(onHelp);
  onHelpRef.current = onHelp;

  useEffect(() => {
    const run = (action: ShortcutAction): void => {
      switch (action.type) {
        case "go":
          navigate(action.to);
          break;
        case "new-trade":
          navigate("/trades?new=1");
          break;
        case "search":
          if (!document.querySelector(SEARCH_SELECTOR)) navigate("/trades");
          focusSearch();
          break;
        case "help":
          onHelpRef.current();
          break;
      }
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.repeat) return;

      const result = resolveKeyPress(
        {
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          isTyping: isTextEntry(event.target as Element | null),
          dialogOpen: document.querySelector('[role="dialog"][aria-modal="true"]') !== null,
        },
        stateRef.current,
      );

      stateRef.current = result.state;
      window.clearTimeout(timerRef.current);
      if (result.state.awaitingGo) {
        timerRef.current = window.setTimeout(() => {
          stateRef.current = IDLE;
        }, GO_TIMEOUT_MS);
      }

      if (result.handled) event.preventDefault();
      if (result.action) run(result.action);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timerRef.current);
    };
  }, [navigate]);
}