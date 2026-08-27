import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, id, ...rest }, ref) {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-medium uppercase tracking-widest text-text-faint"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className="rounded-lg border border-line bg-bg-0 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-line-strong"
          {...rest}
        />
        {error ? (
          <p className="text-xs text-signal-red">{error}</p>
        ) : null}
      </div>
    );
  },
);