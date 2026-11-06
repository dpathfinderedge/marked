import type { AuthError, User } from "@supabase/supabase-js";

export const RESEND_COOLDOWN_SECONDS = 60;

export function isEmailVerified(
  user: Pick<User, "email_confirmed_at"> | null | undefined,
): boolean {
  return Boolean(user?.email_confirmed_at);
}

export function isEmailNotConfirmedError(
  error: Pick<AuthError, "message"> & { code?: string } | null | undefined,
): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === "email_not_confirmed" ||
    /email not confirmed/i.test(error.message)
  );
}