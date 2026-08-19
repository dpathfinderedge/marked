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
          className="font-mono text-xs uppercase tracking-wider text-muted"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className="rounded-lg border border-rule bg-paper px-3 py-2 font-sans text-sm text-ink outline-none transition-colors focus:border-stamp"
          {...rest}
        />
        {error ? (
          <p className="font-mono text-xs text-stamp">{error}</p>
        ) : null}
      </div>
    );
  },
);