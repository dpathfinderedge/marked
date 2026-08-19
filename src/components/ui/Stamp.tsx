export interface StampProps {
  size?: number;
  className?: string;
}

export function Stamp({ size = 36, className = "" }: StampProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      style={{ transform: "rotate(-9deg)" }}
      aria-hidden="true"
    >
      <circle
        cx="18"
        cy="18"
        r="15.5"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <circle
        cx="18"
        cy="18"
        r="11"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
      <path
        d="M12 19L16 23L25 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}