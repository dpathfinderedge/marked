import { useState } from "react";
import { Stamp } from "@/components/ui/Stamp";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export function AuthPage(): JSX.Element {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <Stamp size={30} className="text-text" />
          <h1 className="text-3xl font-bold tracking-tight text-text">Marked</h1>
        </div>

        <div className="rounded-xl border border-line bg-bg-1 p-7 shadow-sm">
          <GoogleSignInButton />

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="font-mono text-xs text-text-muted">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          {mode === "login" ? (
            <LoginForm onSwitchToSignUp={() => setMode("signup")} />
          ) : (
            <SignUpForm onSwitchToLogin={() => setMode("login")} />
          )}
        </div>
      </div>
    </div>
  );
}