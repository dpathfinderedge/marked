import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { AuthPage } from "@/components/auth/AuthPage";
import { AppShell } from "@/components/layout/AppShell";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const DashboardPage = lazy(() =>
  import("@/components/stats/DashboardPage").then((m) => ({
    default: m.DashboardPage,
  })),
);
const TradesPage = lazy(() =>
  import("@/components/trades/TradesPage").then((m) => ({
    default: m.TradesPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/components/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);

function LoadingScreen(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        Loading…
      </p>
    </div>
  );
}

function AppContent(): JSX.Element {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trades" element={<TradesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OfflineBanner />
        <UpdatePrompt />
        <InstallPrompt />
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;