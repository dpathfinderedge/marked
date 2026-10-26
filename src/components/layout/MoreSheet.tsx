import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { CreditCard, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDismiss } from "@/hooks/useDismiss";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { PlanBadge } from "@/components/billing/PlanBadge";

interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const ITEM_CLASS =
  "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] text-text transition-colors active:bg-bg-2";

export function MoreSheet({ isOpen, onClose }: MoreSheetProps): JSX.Element | null {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const panelRef = useRef<HTMLDivElement>(null);

  useDismiss(panelRef, isOpen, onClose);

  // Don't let the page scroll behind the sheet.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignOut = async (): Promise<void> => {
    onClose();
    const { error } = await signOut();
    if (error) showToast(error.message, "error");
  };

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <div className="absolute inset-0 animate-fade-in bg-black/50 motion-reduce:animate-none" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="More"
        className="absolute inset-x-0 bottom-0 animate-sheet-in rounded-t-2xl border-t border-line bg-bg-1 px-3 pt-2 motion-reduce:animate-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-line-strong" aria-hidden="true" />
        <Link to="/profile" onClick={onClose} className={ITEM_CLASS}>
          <User size={20} className="text-text-muted" />
          Profile
        </Link>
        <Link to="/settings" onClick={onClose} className={ITEM_CLASS}>
          <Settings size={20} className="text-text-muted" />
          Settings
        </Link>
        <Link to="/billing" onClick={onClose} className={ITEM_CLASS}>
          <CreditCard size={20} className="text-text-muted" />
          Billing
          <PlanBadge className="ml-auto" />
        </Link>
        <div className="my-1 border-t border-line" />
        <button type="button" onClick={toggleTheme} className={ITEM_CLASS}>
          {theme === "dark" ? (
            <Sun size={20} className="text-text-muted" />
          ) : (
            <Moon size={20} className="text-text-muted" />
          )}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button type="button" onClick={() => void handleSignOut()} className={ITEM_CLASS}>
          <LogOut size={20} className="text-text-muted" />
          Sign out
        </button>
      </div>
    </div>
  );
}