import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

export interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  icon: LucideIcon;
  labelAction?: ReactNode;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  function AuthField(
    { label, icon: Icon, labelAction, type = "text", className = "", ...rest },
    ref,
  ) {
    const id = useId();
    const [isRevealed, setIsRevealed] = useState(false);
    const isPassword = type === "password";

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className="text-[13px] font-medium text-text">
            {label}
          </label>
          {labelAction}
        </div>
        <div className="group relative">
          <Icon
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint transition-colors group-focus-within:text-text-muted"
          />
          <input
            ref={ref}
            id={id}
            type={isPassword && isRevealed ? "text" : type}
            className={`h-11 w-full rounded-lg border border-line bg-bg-0 pl-10 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-faint hover:border-line-strong focus:border-signal-red/60 focus:ring-4 focus:ring-signal-red/10 ${
              isPassword ? "pr-11" : "pr-3.5"
            } ${className}`}
            {...rest}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setIsRevealed((current) => !current)}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-text-faint transition-colors hover:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-red/40"
              aria-label={isRevealed ? "Hide password" : "Show password"}
              aria-pressed={isRevealed}
            >
              {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          ) : null}
        </div>
      </div>
    );
  },
);