import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { AuthPage } from "@/components/auth/AuthPage";
import { AppShell } from "@/components/layout/AppShell";

function AppContent(): JSX.Element {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          Loading…
        </p>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <AppShell>
      <p className="font-sans text-sm text-ink">
        Signed in. Trade entry and layout arrive in Phase 4.
      </p>
    </AppShell>
  );
}

function App(): JSX.Element {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;