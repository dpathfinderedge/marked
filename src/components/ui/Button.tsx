import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}

export function Button({
  variant = "primary",
  isLoading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps): JSX.Element {
  const base =
    "rounded-lg px-4 py-2 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50";

  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-signal-red text-white hover:opacity-90",
    secondary:
      "border border-line bg-transparent text-text hover:bg-bg-2",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? "Working…" : children}
    </button>
  );
}