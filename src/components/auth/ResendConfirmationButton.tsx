import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RESEND_COOLDOWN_SECONDS } from "@/lib/emailVerification";

interface ResendConfirmationButtonProps {
  email: string;
  className?: string;
}

type Status = "idle" | "sending" | "sent" | "error";

export function ResendConfirmationButton({
  email,
  className = "",
}: ResendConfirmationButtonProps): JSX.Element {
  const { resendConfirmation } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const handleClick = async (): Promise<void> => {
    setStatus("sending");
    setMessage(null);

    const { error } = await resendConfirmation(email);

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
  };

  const isDisabled = status === "sending" || secondsLeft > 0;

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className="text-sm font-medium text-text underline underline-offset-4 transition-colors hover:text-signal-red disabled:cursor-not-allowed disabled:text-text-faint disabled:no-underline"
      >
        {status === "sending"
          ? "Sending…"
          : secondsLeft > 0
            ? `Resend in ${secondsLeft}s`
            : "Resend email"}
      </button>
      {status === "sent" ? (
        <p role="status" className="text-xs text-signal-green">
          Email sent. Check your spam folder too.
        </p>
      ) : null}
      {status === "error" && message ? (
        <p role="alert" className="text-xs text-signal-red">
          {message}
        </p>
      ) : null}
    </div>
  );
}