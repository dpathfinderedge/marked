import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string | null;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, error, id, ...rest }, ref) {
    const [isVisible, setIsVisible] = useState(false);
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-medium uppercase tracking-widest text-text-faint"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isVisible ? "text" : "password"}
            className="w-full rounded-lg border border-line bg-bg-0 px-3 py-2 pr-10 text-sm text-text outline-none transition-colors focus:border-line-strong"
            {...rest}
          />
          <button
            type="button"
            onClick={() => setIsVisible((current) => !current)}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faint transition-colors hover:text-text-muted"
            aria-label={isVisible ? "Hide password" : "Show password"}
          >
            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error ? <p className="text-xs text-signal-red">{error}</p> : null}
      </div>
    );
  },
);