import { useState } from "react";
import { MoreVertical, Sun, Moon, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Stamp } from "@/components/ui/Stamp";

export function MobileTopBar(): JSX.Element {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="relative flex items-center justify-between border-b border-line bg-bg-0 px-4 py-3 sm:hidden">
      <div className="flex items-center gap-2">
        <Stamp size={22} className="text-signal-red" />
        <span className="text-[15px] font-semibold tracking-tight text-text">
          Marked
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsMenuOpen((current) => !current)}
        aria-expanded={isMenuOpen}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-2 hover:text-text"
      >
        <MoreVertical size={18} />
      </button>

      {isMenuOpen ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="absolute right-4 top-14 z-50 w-56 rounded-xl border border-line bg-bg-1 p-2 shadow-lg">
            <p className="truncate px-2 py-1.5 font-mono text-xs text-text-muted">
              {user?.email}
            </p>
            <button
              type="button"
              onClick={() => {
                toggleTheme();
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-text-muted transition-colors hover:bg-bg-2 hover:text-text"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
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
    </header>
  );
}