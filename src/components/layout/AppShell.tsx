import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  NotebookPen,
  Settings,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Stamp } from "@/components/ui/Stamp";
import { getDisplayName } from "@/utils/greeting";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

interface AppShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trades", label: "Trades", icon: NotebookPen },
  { to: "/settings", label: "Settings", icon: Settings },
];

const SIDEBAR_STORAGE_KEY = "marked-sidebar-collapsed";

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const displayName = getDisplayName(user);

  const navLinkClass = (isActive: boolean): string =>
    `flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-signal-red/10 text-signal-red"
        : "text-text-muted hover:bg-bg-2 hover:text-text"
    } ${isCollapsed ? "justify-center" : ""}`;

  const utilityButtonClass =
    "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-bg-2 hover:text-text";

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col justify-between border-r border-line bg-bg-1 py-5 transition-[width] duration-200 sm:flex ${
          isCollapsed ? "w-16 items-center px-2" : "w-56 px-3"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-bg-1 text-text-muted shadow-sm transition-colors hover:text-text"
        >
          {isCollapsed ? (
            <PanelLeftOpen size={13} />
          ) : (
            <PanelLeftClose size={13} />
          )}
        </button>

        <div className={`flex flex-col gap-6 ${isCollapsed ? "items-center" : ""}`}>
          <div className={`flex items-center gap-2.5 ${isCollapsed ? "" : "px-2"}`}>
            <Stamp size={24} className="shrink-0 text-signal-red" />
            {!isCollapsed ? (
              <span className="text-[15px] font-semibold tracking-tight text-text">
                Marked
              </span>
            ) : null}
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => navLinkClass(isActive)}
                title={isCollapsed ? label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!isCollapsed ? <span>{label}</span> : null}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={`flex flex-col gap-1 ${isCollapsed ? "items-center" : ""}`}>
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className={`${utilityButtonClass} ${isCollapsed ? "justify-center" : ""}`}
          >
            {theme === "dark" ? (
              <Sun size={18} className="shrink-0" />
            ) : (
              <Moon size={18} className="shrink-0" />
            )}
            {!isCollapsed ? (
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            ) : null}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
              aria-expanded={isProfileMenuOpen}
              className={`${utilityButtonClass} ${isCollapsed ? "justify-center" : ""}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal-red text-[11px] font-semibold text-white">
                {getInitial(displayName)}
              </span>
              {!isCollapsed ? (
                <span className="truncate text-text">{displayName}</span>
              ) : null}
            </button>

            {isProfileMenuOpen ? (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute bottom-11 left-0 z-50 w-56 rounded-xl border border-line bg-bg-1 p-2 shadow-lg">
                  <p className="truncate px-2 py-1.5 font-mono text-xs text-text-muted">
                    {user?.email}
                  </p>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-text-muted transition-colors hover:bg-bg-2 hover:text-text"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </aside>

      <MobileTopBar />

      <main className="flex-1 p-6 pb-24 sm:pb-6">{children}</main>

      <MobileTabBar />
    </div>
  );
}