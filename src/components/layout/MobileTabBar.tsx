import { NavLink } from "react-router-dom";
import { LayoutDashboard, NotebookPen, Settings } from "lucide-react";

const TAB_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trades", label: "Trades", icon: NotebookPen },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function MobileTabBar(): JSX.Element {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-bg-1/95 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TAB_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              isActive ? "text-signal-red" : "text-text-muted"
            }`
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}