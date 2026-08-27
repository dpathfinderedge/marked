import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface SignUpFormProps {
  onSwitchToLogin: () => void;
}

export function SignUpForm({
  onSwitchToLogin,
}: SignUpFormProps): JSX.Element {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    const { error: signUpError } = await signUp(email, password);
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setConfirmationSent(true);
  };

  if (confirmationSent) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="font-sans text-sm text-text">
          Check <span className="font-medium">{email}</span> for a
          confirmation link to finish setting up your account.
        </p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-mono text-xs uppercase tracking-wider text-text-muted underline underline-offset-4"
        >
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={error}
      />
      <Button type="submit" isLoading={isSubmitting}>
        Create account
      </Button>
      <button
        type="button"
        onClick={onSwitchToLogin}
        className="font-mono text-xs uppercase tracking-wider text-text-muted underline underline-offset-4"
      >
        Already have an account? Log in
      </button>
    </form>
  );
}