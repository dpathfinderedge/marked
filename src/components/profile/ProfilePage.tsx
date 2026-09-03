import { useState, type ChangeEvent, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/useToast";
import { getDisplayName, getAvatarUrl } from "@/utils/greeting";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function getInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

function hasPasswordAuth(user: User | null): boolean {
  return (user?.identities ?? []).some(
    (identity) => identity.provider === "email",
  );
}

export function ProfilePage(): JSX.Element {
  const { user } = useAuth();
  const { updateDisplayName, updatePassword, uploadAvatar, deleteAccount } =
    useProfile();
  const { showToast } = useToast();

  const [name, setName] = useState(getDisplayName(user));
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState(getAvatarUrl(user));
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const showPasswordSection = hasPasswordAuth(user);

  const handleAvatarChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      showToast("That image is over 5MB — choose a smaller one.", "error");
      event.target.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    const { error, url } = await uploadAvatar(file);
    setIsUploadingAvatar(false);
    event.target.value = "";

    if (error) {
      showToast(error, "error");
      return;
    }
    if (url) setAvatarUrl(url);
    showToast("Photo updated.");
  };

  const handleNameSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setNameError(null);

    if (!name.trim()) {
      setNameError("Name can't be empty.");
      return;
    }

    setIsSavingName(true);
    const { error } = await updateDisplayName(name.trim());
    setIsSavingName(false);

    if (error) {
      setNameError(error);
      showToast(error, "error");
      return;
    }
    showToast("Name updated.");
  };

  const handlePasswordSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }

    setIsSavingPassword(true);
    const { error } = await updatePassword(currentPassword, newPassword);
    setIsSavingPassword(false);

    if (error) {
      setPasswordError(error);
      showToast(error, "error");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    showToast("Password updated.");
  };

  const handleDeleteAccount = async (): Promise<void> => {
    setDeleteError(null);
    setIsDeleting(true);
    const { error } = await deleteAccount();
    setIsDeleting(false);

    if (error) {
      setDeleteError(error);
      showToast(error, "error");
      return;
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight text-text">Profile</h1>

      <div className="flex items-center gap-4">
        <label className="group relative cursor-pointer">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-signal-red text-xl font-semibold text-white">
              {getInitial(name || getDisplayName(user))}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            {isUploadingAvatar ? "…" : "Change"}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => void handleAvatarChange(e)}
            disabled={isUploadingAvatar}
            className="hidden"
          />
        </label>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text">
            {getDisplayName(user)}
          </span>
          <span className="font-mono text-xs text-text-muted">
            {user?.email}
          </span>
        </div>
      </div>

      <form
        onSubmit={handleNameSubmit}
        className="flex flex-col gap-4 rounded-xl border border-line bg-bg-1 p-6"
      >
        <div>
          <h2 className="text-sm font-medium text-text">Display name</h2>
          <p className="mt-1 text-sm text-text-muted">
            Shown in greetings around the app.
          </p>
        </div>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError}
        />
        <Button type="submit" isLoading={isSavingName}>
          Save
        </Button>
      </form>

      {showPasswordSection ? (
        <form
          onSubmit={handlePasswordSubmit}
          className="flex flex-col gap-4 rounded-xl border border-line bg-bg-1 p-6"
        >
          <div>
            <h2 className="text-sm font-medium text-text">
              Change password
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Confirm your current password to set a new one.
            </p>
          </div>
          <PasswordInput
            label="Current password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <PasswordInput
            label="Confirm new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordError}
          />
          <Button type="submit" isLoading={isSavingPassword}>
            Update password
          </Button>
        </form>
      ) : null}

      <div className="flex flex-col gap-4 rounded-xl border border-signal-red/30 bg-bg-1 p-6">
        <div>
          <h2 className="text-sm font-medium text-text">Danger zone</h2>
          <p className="mt-1 text-sm text-text-muted">
            Permanently delete your account and all trades, attachments, and
            settings. This can't be undone.
          </p>
        </div>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="self-start rounded-lg border border-signal-red/40 px-4 py-2 text-sm font-semibold text-signal-red transition-colors hover:bg-signal-red/10"
          >
            Delete account
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <Input
              label='Type "DELETE" to confirm'
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              error={deleteError}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                className="rounded-lg bg-signal-red px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }}
                className="text-xs font-medium text-text-muted underline underline-offset-4 hover:text-text"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}