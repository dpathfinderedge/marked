export interface GoTarget {
  key: string;
  to: string;
  label: string;
}

export const GO_TARGETS: GoTarget[] = [
  { key: "d", to: "/dashboard", label: "Dashboard" },
  { key: "t", to: "/trades", label: "Trades" },
  { key: "c", to: "/calendar", label: "Calendar" },
  { key: "k", to: "/calculator", label: "Calculator" },
  { key: "i", to: "/insights", label: "Insights" },
  { key: "n", to: "/news", label: "News" },
  { key: "s", to: "/settings", label: "Settings" },
  { key: "b", to: "/billing", label: "Billing" },
];

export type ShortcutAction =
  | { type: "go"; to: string }
  | { type: "new-trade" }
  | { type: "search" }
  | { type: "help" };

export interface KeyPress {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  isTyping: boolean;
  dialogOpen: boolean;
}

export interface ShortcutState {
  awaitingGo: boolean;
}

export const IDLE: ShortcutState = { awaitingGo: false };

export interface ShortcutResult {
  action: ShortcutAction | null;
  state: ShortcutState;
  handled: boolean;
}

const NOTHING: ShortcutResult = { action: null, state: IDLE, handled: false };

export function resolveKeyPress(press: KeyPress, state: ShortcutState): ShortcutResult {
  if (press.ctrlKey || press.metaKey || press.altKey || press.isTyping || press.dialogOpen) {
    return NOTHING;
  }

  const { key } = press;

  if (state.awaitingGo) {
    const target = GO_TARGETS.find((t) => t.key === key);
    if (target) {
      return { action: { type: "go", to: target.to }, state: IDLE, handled: true };
    }
    if (key === "g") return { action: null, state: { awaitingGo: true }, handled: true };
    return NOTHING;
  }

  switch (key) {
    case "g":
      return { action: null, state: { awaitingGo: true }, handled: true };
    case "n":
      return { action: { type: "new-trade" }, state: IDLE, handled: true };
    case "/":
      return { action: { type: "search" }, state: IDLE, handled: true };
    case "?":
      return { action: { type: "help" }, state: IDLE, handled: true };
    default:
      return NOTHING;
  }
}

const NON_TEXT_INPUTS = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "range",
  "color",
  "file",
  "image",
]);

export interface ElementLike {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
}

export function isTextEntry(element: ElementLike | null): boolean {
  if (!element) return false;
  if (element.isContentEditable) return true;
  const tag = element.tagName?.toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return !NON_TEXT_INPUTS.has((element.type ?? "text").toLowerCase());
  return false;
}