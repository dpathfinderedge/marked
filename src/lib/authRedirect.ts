export const DEFAULT_AFTER_LOGIN = "/dashboard";

interface ReturnState {
  from?: { pathname?: unknown; search?: unknown };
}

export function getReturnPath(state: unknown): string {
  const from = (state as ReturnState | null | undefined)?.from;
  const pathname = typeof from?.pathname === "string" ? from.pathname : "";
  const search = typeof from?.search === "string" ? from.search : "";

  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname === "/" ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  ) {
    return DEFAULT_AFTER_LOGIN;
  }

  return `${pathname}${search}`;
}