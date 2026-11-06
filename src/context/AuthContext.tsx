import * as Sentry from "@sentry/react";
import { useEffect, useState, type ReactNode } from "react";
import type { Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      Sentry.setUser({ id: session.user.id, email: session.user.email });
    } else {
      Sentry.setUser(null);
    }
  }, [session]);

  const signUp: AuthContextValue["signUp"] = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    return { error, needsConfirmation: !error && !data.session };
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle: AuthContextValue["signInWithGoogle"] = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const resetPassword: AuthContextValue["resetPassword"] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    return { error };
  };

  const updatePassword: AuthContextValue["updatePassword"] = async (
    password,
  ) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const resendConfirmation: AuthContextValue["resendConfirmation"] = async (
    email,
  ) => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    return { error };
  };

  const refreshSession: AuthContextValue["refreshSession"] = async () => {
    const { error } = await supabase.auth.refreshSession();
    return { error };
  };

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    isLoading,
    signUp,
    signIn,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    resendConfirmation,
    refreshSession,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}