import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDismiss } from "@/hooks/useDismiss";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { getAvatarUrl, getDisplayName } from "@/utils/greeting";

interface UserMenuProps {
  isCollapsed: boolean;
}

function getInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-text-muted transition-colors hover:bg-bg-2 hover:text-text";

export function UserMenu({ isCollapsed }: UserMenuProps): JSX.Element {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(ref, isOpen, close);

  const displayName = getDisplayName(user);
  const avatarUrl = getAvatarUrl(user);

  const handleSignOut = async (): Promise<void> => {
    close();
    const { error } = await signOut();
    if (error) showToast(error.message, "error");
  };

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={isCollapsed ? displayName : undefined}
        className={`flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-bg-2 ${
          isCollapsed ? "justify-center" : ""
        } ${isOpen ? "bg-bg-2" : ""}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal-red text-xs font-semibold text-white">
            {getInitial(displayName)}
          </span>
        )}
        {!isCollapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text">
                {displayName}
              </span>
            </span>
            <PlanBadge />
            <ChevronsUpDown size={14} className="shrink-0 text-text-faint" />
          </>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className={`absolute z-50 w-56 animate-pop-in rounded-xl border border-line bg-bg-1 p-1.5 shadow-lg motion-reduce:animate-none ${
            isCollapsed ? "bottom-0 left-full ml-2" : "bottom-full left-0 mb-2"
          }`}
        >
          <Link to="/profile" role="menuitem" onClick={close} className={ITEM_CLASS}>
            <User size={16} />
            Profile
          </Link>
          <Link to="/settings" role="menuitem" onClick={close} className={ITEM_CLASS}>
            <Settings size={16} />
            Settings
          </Link>
          <Link to="/billing" role="menuitem" onClick={close} className={ITEM_CLASS}>
            <CreditCard size={16} />
            Billing
            <PlanBadge className="ml-auto" />
          </Link>
          <div className="my-1.5 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            onClick={toggleTheme}
            className={ITEM_CLASS}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleSignOut()}
            className={ITEM_CLASS}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}