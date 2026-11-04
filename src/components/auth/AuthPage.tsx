import { useLocation, useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthLayout } from "@/components/auth/AuthLayout";

export type AuthMode = "login" | "signup";

const PATHS: Record<AuthMode, string> = {
  login: "/auth",
  signup: "/auth/signup",
};

const COPY: Record<AuthMode, { title: string; subtitle: string }> = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to pick up where you left off.",
  },
  signup: {
    title: "Create your account",
    subtitle: "Start journaling for free. It takes a minute.",
  },
};

export function AuthPage({ mode }: { mode: AuthMode }): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const copy = COPY[mode];

  const switchTo = (next: AuthMode): void => {
    navigate(PATHS[next], { replace: true, state: location.state });
  };

  return (
    <AuthLayout>
      <div
        role="tablist"
        aria-label="Log in or sign up"
        className="mb-8 grid grid-cols-2 rounded-lg border border-line bg-bg-2 p-1"
      >
        {(["login", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => switchTo(value)}
            className={`rounded-md py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-red/40 ${
              mode === value
                ? "bg-bg-1 text-text shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            {value === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      <div key={mode} className="animate-fade-in">
        <h1 className="text-[26px] font-bold tracking-tight text-text">
          {copy.title}
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">{copy.subtitle}</p>

        <div className="mt-7">
          <GoogleSignInButton />
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="text-xs text-text-faint">or continue with email</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        {mode === "login" ? (
          <LoginForm />
        ) : (
          <SignUpForm onSwitchToLogin={() => switchTo("login")} />
        )}

        <p className="mt-6 text-center text-[13px] text-text-muted">
          {mode === "login" ? "New to Marked? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => switchTo(mode === "login" ? "signup" : "login")}
            className="font-medium text-text underline underline-offset-4 transition-colors hover:text-signal-red"
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}