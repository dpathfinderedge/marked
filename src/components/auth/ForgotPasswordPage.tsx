import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthField } from "@/components/auth/AuthField";
import { AuthError } from "@/components/auth/AuthError";

export function ForgotPasswordPage(): JSX.Element {
  const { resetPassword } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: resetError } = await resetPassword(email.trim());
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  };

  const backToLogin = (
    <Link
      to="/auth"
      state={location.state}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      Back to log in
    </Link>
  );

  return (
    <AuthLayout>
      <div className="animate-fade-in">
        {sent ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-bg-1 px-6 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-signal-green/15 text-signal-green">
              <MailCheck size={22} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-text">
                Check your inbox
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                If an account exists for{" "}
                <span className="font-medium text-text">{email.trim()}</span>,
                we sent a link to choose a new password. It can only be used
                once.
              </p>
              <p className="mt-2 text-[13px] text-text-faint">
                Nothing there? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="font-medium text-text-muted underline underline-offset-4 transition-colors hover:text-text"
                >
                  try again
                </button>
                .
              </p>
            </div>
            {backToLogin}
          </div>
        ) : (
          <>
            <h1 className="text-[26px] font-bold tracking-tight text-text">
              Reset your password
            </h1>
            <p className="mt-1.5 text-sm text-text-muted">
              Enter the email you signed up with and we'll send you a link to
              choose a new password.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
              <AuthField
                label="Email"
                icon={Mail}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error ? <AuthError message={error} /> : null}
              <Button type="submit" isLoading={isSubmitting} className="h-11 w-full">
                Send reset link
              </Button>
            </form>

            <div className="mt-6 text-center">{backToLogin}</div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}