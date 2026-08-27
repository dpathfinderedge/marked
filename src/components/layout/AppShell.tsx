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
import { Button } from "@/components/ui/Button";
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

export function AppShell({ children }: AppShellProps): JSX.Element {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

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
        className={`hidden shrink-0 flex-col justify-between border-r border-line bg-bg-1 py-5 transition-[width] duration-200 sm:flex ${
          isCollapsed ? "w-16 items-center px-2" : "w-56 px-3"
        }`}
      >
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

          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`${utilityButtonClass} ${isCollapsed ? "justify-center" : ""}`}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={18} className="shrink-0" />
            ) : (
              <PanelLeftClose size={18} className="shrink-0" />
            )}
            {!isCollapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </aside>

      <MobileTopBar />

      <div className="flex flex-1 flex-col">
        <header className="hidden items-center justify-between border-b border-line px-6 py-4 sm:flex">
          <span className="font-mono text-xs text-text-muted">{user?.email}</span>
          <Button variant="secondary" onClick={() => void signOut()}>
            <span className="flex items-center gap-1.5">
              <LogOut size={14} />
              Sign out
            </span>
          </Button>
        </header>

        <main className="flex-1 p-6 pb-24 sm:pb-6">{children}</main>
      </div>

      <MobileTabBar />
    </div>
  );
}