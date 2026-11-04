import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, LinkIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthField } from "@/components/auth/AuthField";
import { AuthError } from "@/components/auth/AuthError";
import {
  MIN_PASSWORD_LENGTH,
  PasswordRule,
} from "@/components/auth/PasswordRule";
import { DEFAULT_AFTER_LOGIN } from "@/lib/authRedirect";

export function ResetPasswordPage(): JSX.Element {
  const { session, updatePassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!session) {
    return (
      <AuthLayout>
        <div className="animate-fade-in flex flex-col items-center gap-4 rounded-xl border border-line bg-bg-1 px-6 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-signal-red/15 text-signal-red">
            <LinkIcon size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-text">
              This link has expired
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              Reset links work once and stop working after a while. Request a
              new one to choose a new password.
            </p>
          </div>
          <Link
            to="/auth/forgot"
            className="flex h-11 w-full items-center justify-center rounded-lg bg-signal-red text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    showToast("Password updated.");
    navigate(DEFAULT_AFTER_LOGIN, { replace: true });
  };

  return (
    <AuthLayout>
      <div className="animate-fade-in">
        <h1 className="text-[26px] font-bold tracking-tight text-text">
          Choose a new password
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          You'll stay logged in on this device.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <AuthField
              label="New password"
              icon={Lock}
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordRule password={password} />
          </div>
          <AuthField
            label="Confirm new password"
            icon={Lock}
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error ? <AuthError message={error} /> : null}
          <Button type="submit" isLoading={isSubmitting} className="h-11 w-full">
            Update password
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}