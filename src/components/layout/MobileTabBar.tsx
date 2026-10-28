import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Ellipsis } from "lucide-react";
import { ACCOUNT_PATHS, PRIMARY_NAV, SECONDARY_NAV } from "@/components/layout/navigation";
import { MoreSheet } from "@/components/layout/MoreSheet";

const TAB_CLASS =
  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors";

export function MobileTabBar(): JSX.Element {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const isOnMorePage = [
    ...ACCOUNT_PATHS,
    ...SECONDARY_NAV.map((item) => item.to),
  ].some((path) => pathname.startsWith(path));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-bg-1/95 backdrop-blur-md sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${TAB_CLASS} ${isActive ? "text-signal-red" : "text-text-muted"}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          aria-haspopup="dialog"
          className={`${TAB_CLASS} ${
            isOnMorePage || isMoreOpen ? "text-signal-red" : "text-text-muted"
          }`}
        >
          <Ellipsis size={20} />
          <span>More</span>
        </button>
      </nav>
      <MoreSheet isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
}