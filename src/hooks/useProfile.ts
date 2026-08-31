import { supabase } from "@/lib/supabase";

interface UseProfileResult {
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

export function useProfile(): UseProfileResult {
  const updateDisplayName = async (
    name: string,
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name },
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (
    password: string,
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  return { updateDisplayName, updatePassword };
}