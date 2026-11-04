import { Check } from "lucide-react";

export const MIN_PASSWORD_LENGTH = 8;

export function PasswordRule({ password }: { password: string }): JSX.Element {
  const isMet = password.length >= MIN_PASSWORD_LENGTH;

  return (
    <p
      className={`flex items-center gap-1.5 text-xs transition-colors ${
        isMet ? "text-signal-green" : "text-text-faint"
      }`}
    >
      <Check size={13} aria-hidden="true" />
      At least {MIN_PASSWORD_LENGTH} characters
    </p>
  );
}