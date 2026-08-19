import { useState } from "react";
import { Stamp } from "@/components/ui/Stamp";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";

export function AuthPage(): JSX.Element {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-baseline gap-3">
          <Stamp size={30} className="text-ink" />
          <h1 className="font-display text-3xl italic text-ink">Marked</h1>
        </div>

        <div className="rounded-xl border border-rule bg-surface p-6">
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