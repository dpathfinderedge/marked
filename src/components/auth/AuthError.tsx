import { CircleAlert } from "lucide-react";

export function AuthError({ message }: { message: string }): JSX.Element {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-signal-red/30 bg-signal-red/10 px-3.5 py-2.5 text-[13px] leading-snug text-text"
    >
      <CircleAlert
        size={16}
        aria-hidden="true"
        className="mt-px shrink-0 text-signal-red"
      />
      <span>{message}</span>
    </div>
  );
}