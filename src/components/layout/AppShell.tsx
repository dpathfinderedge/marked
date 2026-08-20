import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, NotebookPen, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Stamp } from "@/components/ui/Stamp";
import { Button } from "@/components/ui/Button";

interface AppShellProps {
  children: ReactNode;
}

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  `flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
    isActive ? "bg-stamp/10 text-stamp" : "text-muted hover:text-ink"
  }`;

export function AppShell({ children }: AppShellProps): JSX.Element {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-16 flex-col items-center justify-between border-r border-rule bg-surface py-6">
        <div className="flex flex-col items-center gap-6">
          <Stamp size={28} className="text-stamp" />
          <div className="flex flex-col gap-2">
            <NavLink to="/dashboard" className={navLinkClass} title="Dashboard">
              <LayoutDashboard size={18} />
            </NavLink>
            <NavLink to="/trades" className={navLinkClass} title="Trades">
              <NotebookPen size={18} />
            </NavLink>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:text-ink"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-rule px-6 py-4">
          <span className="font-mono text-xs text-muted">{user?.email}</span>
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}