import type { ReactNode } from "react";
import { Stamp } from "@/components/ui/Stamp";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legal";

export function AuthLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <AuthBrandPanel />

      <main className="flex flex-col items-center px-5 py-10 sm:px-8">
        <div className="flex w-full max-w-[400px] flex-1 flex-col justify-center">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Stamp size={28} className="text-text" />
            <span className="text-xl font-bold tracking-tight text-text">Marked</span>
          </div>
          {children}
        </div>

        <p className="mt-10 max-w-[400px] text-center text-xs leading-relaxed text-text-faint">
          By continuing, you agree to our{" "}
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-text-muted"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-text-muted"
          >
            Privacy Policy
          </a>
          .
        </p>
      </main>
    </div>
  );
}