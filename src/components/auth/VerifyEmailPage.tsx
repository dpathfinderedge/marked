import { useState } from "react";
import { MailCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResendConfirmationButton } from "@/components/auth/ResendConfirmationButton";

export function VerifyEmailPage(): JSX.Element {
  const { user, refreshSession, signOut } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const email = user?.email ?? "";

  const handleCheck = async (): Promise<void> => {
    setIsChecking(true);
    setNotYet(false);
    await refreshSession();
    setIsChecking(false);
    setNotYet(true);
  };

  return (
    <AuthLayout>
      <div className="animate-fade-in flex flex-col items-center gap-5 rounded-xl border border-line bg-bg-1 px-6 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-signal-green/15 text-signal-green">
          <MailCheck size={22} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-text">
            Verify your email
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            We sent a confirmation link to{" "}
            <span className="font-medium text-text">{email}</span>. Open it to
            start using Marked.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleCheck}
          isLoading={isChecking}
          className="h-11 w-full"
        >
          I've verified my email
        </Button>
        {notYet ? (
          <p role="status" className="-mt-2 text-xs text-text-muted">
            Not verified yet. Open the link in the email first.
          </p>
        ) : null}

        <ResendConfirmationButton email={email} />

        <button
          type="button"
          onClick={() => void signOut()}
          className="text-[13px] text-text-muted transition-colors hover:text-text"
        >
          Log out
        </button>
      </div>
    </AuthLayout>
  );
}