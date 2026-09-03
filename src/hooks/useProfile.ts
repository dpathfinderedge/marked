import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const AVATAR_BUCKET = "avatars";

interface UseProfileResult {
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
  updatePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ error: string | null }>;
  uploadAvatar: (
    file: File,
  ) => Promise<{ error: string | null; url?: string }>;
  deleteAccount: () => Promise<{ error: string | null }>;
}

export function useProfile(): UseProfileResult {
  const { user, signOut } = useAuth();

  const updateDisplayName = async (
    name: string,
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name },
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<{ error: string | null }> => {
    if (!user?.email) {
      return { error: "No email on this account to verify against." };
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      return { error: "Current password is incorrect." };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error: error?.message ?? null };
  };

  const uploadAvatar = async (
    file: File,
  ): Promise<{ error: string | null; url?: string }> => {
    if (!user) return { error: "Not signed in." };

    const path = `${user.id}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) return { error: uploadError.message };

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: url },
    });
    if (updateError) return { error: updateError.message };

    return { error: null, url };
  };

  const deleteAccount = async (): Promise<{ error: string | null }> => {
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) return { error: error.message };

    await signOut();
    return { error: null };
  };

  return { updateDisplayName, updatePassword, uploadAvatar, deleteAccount };
}