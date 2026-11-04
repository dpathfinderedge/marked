import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/components/auth/AuthField";
import { AuthError } from "@/components/auth/AuthError";

export function LoginForm(): JSX.Element {
  const { signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn(email, password);
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      <AuthField
        label="Password"
        labelAction={
          <Link
            to="/auth/forgot"
            state={location.state}
            className="text-[13px] text-text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
          >
            Forgot password?
          </Link>
        }
        icon={Lock}
        type="password"
        autoComplete="current-password"
        placeholder="Your password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <AuthError message={error} /> : null}
      <Button type="submit" isLoading={isSubmitting} className="h-11 w-full">
        Log in
      </Button>
    </form>
  );
}