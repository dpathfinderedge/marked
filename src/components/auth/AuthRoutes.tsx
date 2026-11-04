import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getReturnPath } from "@/lib/authRedirect";
import { AuthPage } from "@/components/auth/AuthPage";
import { ForgotPasswordPage } from "@/components/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/components/auth/ResetPasswordPage";

function RedirectIfSignedIn(): JSX.Element {
  const { session } = useAuth();
  const location = useLocation();

  if (session) {
    return <Navigate to={getReturnPath(location.state)} replace />;
  }

  return <Outlet />;
}

export function AuthRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="reset" element={<ResetPasswordPage />} />
      <Route element={<RedirectIfSignedIn />}>
        <Route index element={<AuthPage mode="login" />} />
        <Route path="signup" element={<AuthPage mode="signup" />} />
        <Route path="forgot" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}