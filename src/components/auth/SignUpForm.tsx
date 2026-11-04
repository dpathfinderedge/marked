import { useState, type FormEvent } from "react";
import { ArrowLeft, Check, Lock, Mail, MailCheck, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/components/auth/AuthField";
import { AuthError } from "@/components/auth/AuthError";

interface SignUpFormProps {
  onSwitchToLogin: () => void;
}

const MIN_PASSWORD_LENGTH = 8;

export function SignUpForm({
  onSwitchToLogin,
}: SignUpFormProps): JSX.Element {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const isLongEnough = password.length >= MIN_PASSWORD_LENGTH;

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (!isLongEnough) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    const { error: signUpError } = await signUp(email, password, name.trim());
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setConfirmationSent(true);
  };

  if (confirmationSent) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-bg-1 px-6 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-signal-green/15 text-signal-green">
          <MailCheck size={22} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-text">
            Check your inbox
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            We sent a confirmation link to{" "}
            <span className="font-medium text-text">{email}</span>. Open it to
            finish setting up your account.
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AuthField
        label="Name"
        icon={User}
        autoComplete="name"
        placeholder="Your name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <AuthField
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="flex flex-col gap-2">
        <AuthField
          label="Password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            isLongEnough ? "text-signal-green" : "text-text-faint"
          }`}
        >
          <Check size={13} aria-hidden="true" />
          At least {MIN_PASSWORD_LENGTH} characters
        </p>
      </div>
      <AuthField
        label="Confirm password"
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
        Create account
      </Button>
    </form>
  );
}