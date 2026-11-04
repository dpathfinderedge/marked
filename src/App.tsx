import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { AuthRoutes } from "@/components/auth/AuthRoutes";
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
const CalendarPage = lazy(() =>
  import("@/components/calendar/CalendarPage").then((m) => ({
    default: m.CalendarPage,
  })),
);

const CalculatorPage = lazy(() =>
  import("@/components/calculator/CalculatorPage").then((m) => ({
    default: m.CalculatorPage,
  })),
);

const InsightsPage = lazy(() =>
  import("@/components/insights/InsightsPage").then((m) => ({
    default: m.InsightsPage,
  })),
);

const NewsPage = lazy(() =>
  import("@/components/news/NewsPage").then((m) => ({
    default: m.NewsPage,
  })),
);

const ImportTradesPage = lazy(() =>
  import("@/components/trades/ImportTradesPage").then((m) => ({
    default: m.ImportTradesPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/components/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);

const ProfilePage = lazy(() =>
  import("@/components/profile/ProfilePage").then((m) => ({
    default: m.ProfilePage,
  })),
);

const BillingPage = lazy(() =>
  import("@/components/billing/BillingPage").then((m) => ({
    default: m.BillingPage,
  })),
);

function LoadingScreen(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        Loading…
      </p>
    </div>
  );
}

function RedirectToAuth(): JSX.Element {
  const location = useLocation();

  return <Navigate to="/auth" replace state={{ from: location }} />;
}

function AuthenticatedApp(): JSX.Element {
  const { session } = useAuth();

  if (!session) {
    return <RedirectToAuth />;
  }

  return (
    <AppShell>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/trades/import" element={<ImportTradesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

function AppContent(): JSX.Element {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/*" element={<AuthRoutes />} />
        <Route path="*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <OfflineBanner />
            <UpdatePrompt />
            <InstallPrompt />
            <AppContent />
          </SubscriptionProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;