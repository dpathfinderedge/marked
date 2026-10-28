import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Stamp } from "@/components/ui/Stamp";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { UserMenu } from "@/components/layout/UserMenu";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/navigation";
import { PastDueBanner } from "@/components/billing/PastDueBanner";

interface AppShellProps {
  children: ReactNode;
}

const SIDEBAR_STORAGE_KEY = "marked-sidebar-collapsed";

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

export function AppShell({ children }: AppShellProps): JSX.Element {
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

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col justify-between border-r border-line bg-bg-1 py-5 transition-[width] duration-200 sm:flex ${
          isCollapsed ? "w-16 items-center px-2" : "w-60 px-3"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-bg-1 text-text-muted shadow-sm transition-colors hover:text-text"
        >
          {isCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
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
            {[...PRIMARY_NAV, ...SECONDARY_NAV].map(({ to, label, icon: Icon }) => (
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

        <UserMenu isCollapsed={isCollapsed} />
      </aside>

      <MobileTopBar />

      <main className="min-w-0 flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-7 sm:pb-10 lg:px-10">
        <div className="w-full max-w-[1360px]">
          <PastDueBanner />
          {children}
        </div>
      </main>

      <MobileTabBar />
    </div>
  );
}