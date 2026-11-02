import { describe, expect, it } from "vitest";
import { ACCOUNT_PATHS, PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/navigation";
import {
  GO_TARGETS,
  IDLE,
  isTextEntry,
  resolveKeyPress,
  type KeyPress,
  type ShortcutState,
} from "./shortcuts";

const press = (key: string, extra: Partial<KeyPress> = {}): KeyPress => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  isTyping: false,
  dialogOpen: false,
  ...extra,
});

const WAITING: ShortcutState = { awaitingGo: true };

describe("resolveKeyPress", () => {
  it("N logs a new trade, / searches, ? opens help", () => {
    expect(resolveKeyPress(press("n"), IDLE)).toEqual({
      action: { type: "new-trade" },
      state: IDLE,
      handled: true,
    });
    expect(resolveKeyPress(press("/"), IDLE).action).toEqual({ type: "search" });
    expect(resolveKeyPress(press("?"), IDLE).action).toEqual({ type: "help" });
  });

  it("G waits for a second key", () => {
    const first = resolveKeyPress(press("g"), IDLE);
    expect(first).toEqual({ action: null, state: WAITING, handled: true });
  });

  it("G then a letter goes to that page", () => {
    expect(resolveKeyPress(press("t"), WAITING)).toEqual({
      action: { type: "go", to: "/trades" },
      state: IDLE,
      handled: true,
    });
    expect(resolveKeyPress(press("n"), WAITING).action).toEqual({ type: "go", to: "/news" });
  });

  it("G then G keeps waiting", () => {
    expect(resolveKeyPress(press("g"), WAITING).state).toEqual(WAITING);
  });

  it("G then an unknown key cancels, and does not act on that key", () => {
    expect(resolveKeyPress(press("x"), WAITING)).toEqual({ action: null, state: IDLE, handled: false });
    expect(resolveKeyPress(press("Escape"), WAITING).state).toEqual(IDLE);
  });

  it("stays quiet while typing, in a dialog, or with Ctrl, Cmd or Alt held", () => {
    for (const extra of [
      { isTyping: true },
      { dialogOpen: true },
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
    ]) {
      expect(resolveKeyPress(press("n", extra), IDLE)).toEqual({ action: null, state: IDLE, handled: false });
    }
  });

  it("drops a pending G when typing starts", () => {
    expect(resolveKeyPress(press("t", { isTyping: true }), WAITING).state).toEqual(IDLE);
  });

  it("ignores capital letters and other keys", () => {
    for (const key of ["N", "G", "a", "Enter", " ", "1"]) {
      expect(resolveKeyPress(press(key), IDLE).action).toBeNull();
    }
    expect(resolveKeyPress(press("T"), WAITING).action).toBeNull();
  });
});

describe("GO_TARGETS", () => {
  it("uses each key once", () => {
    const keys = GO_TARGETS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never uses a key that is a shortcut on its own", () => {
    expect(GO_TARGETS.some((t) => t.key === "g")).toBe(false);
  });

  it("covers every page in the sidebar", () => {
    const paths = GO_TARGETS.map((t) => t.to);
    for (const item of [...PRIMARY_NAV, ...SECONDARY_NAV]) expect(paths).toContain(item.to);
  });

  it("only points at real account pages besides the sidebar ones", () => {
    const known = new Set([...PRIMARY_NAV, ...SECONDARY_NAV].map((n) => n.to).concat(ACCOUNT_PATHS));
    for (const target of GO_TARGETS) expect(known.has(target.to)).toBe(true);
  });
});

describe("isTextEntry", () => {
  it("is true for fields you type in", () => {
    for (const type of ["text", "search", "number", "email", "password"]) {
      expect(isTextEntry({ tagName: "INPUT", type })).toBe(true);
    }
    expect(isTextEntry({ tagName: "INPUT" })).toBe(true);
    expect(isTextEntry({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTextEntry({ tagName: "SELECT" })).toBe(true);
    expect(isTextEntry({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("is false for checkboxes, buttons and plain elements", () => {
    expect(isTextEntry({ tagName: "INPUT", type: "checkbox" })).toBe(false);
    expect(isTextEntry({ tagName: "INPUT", type: "radio" })).toBe(false);
    expect(isTextEntry({ tagName: "BUTTON" })).toBe(false);
    expect(isTextEntry({ tagName: "DIV" })).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });
});