import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({
  title,
  description,
  action,
  className = "",
  children,
}: CardProps): JSX.Element {
  return (
    <section
      className={`rounded-xl border border-line bg-bg-1 p-5 ${className}`}
    >
      {title || action ? (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold text-text">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-text-muted">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}