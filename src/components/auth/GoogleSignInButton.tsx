import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

function GoogleLogo(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export function GoogleSignInButton(): JSX.Element {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleClick = async (): Promise<void> => {
    setError(null);
    setIsRedirecting(true);

    const { error: signInError } = await signInWithGoogle();

    if (signInError) {
      setError(signInError.message);
      setIsRedirecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isRedirecting}
        className="flex items-center justify-center gap-3 rounded-lg border border-rule bg-paper px-4 py-2 font-sans text-sm font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GoogleLogo />
        {isRedirecting ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? <p className="font-mono text-xs text-stamp">{error}</p> : null}
    </div>
  );
}