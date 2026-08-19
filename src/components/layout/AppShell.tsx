import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Stamp } from "@/components/ui/Stamp";
import { Button } from "@/components/ui/Button";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-16 flex-col items-center gap-6 border-r border-rule bg-surface py-6">
        <Stamp size={28} className="text-stamp" />
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