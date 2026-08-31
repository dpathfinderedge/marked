import { useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { getDisplayName } from "@/utils/greeting";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
  const { updateDisplayName, updatePassword } = useProfile();

  const [name, setName] = useState(getDisplayName(user));
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const showPasswordSection = hasPasswordAuth(user);

  const handleNameSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setNameError(null);
    setNameSaved(false);

    if (!name.trim()) {
      setNameError("Name can't be empty.");
      return;
    }

    setIsSavingName(true);
    const { error } = await updateDisplayName(name.trim());
    setIsSavingName(false);

    if (error) {
      setNameError(error);
      return;
    }
    setNameSaved(true);
  };

  const handlePasswordSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }

    setIsSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    setIsSavingPassword(false);

    if (error) {
      setPasswordError(error);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight text-text">Profile</h1>

      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-signal-red text-xl font-semibold text-white">
          {getInitial(name || getDisplayName(user))}
        </span>
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
        {nameSaved ? (
          <p className="text-xs text-signal-green">Saved.</p>
        ) : null}
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
              Choose a new password for your account.
            </p>
          </div>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordError}
          />
          {passwordSaved ? (
            <p className="text-xs text-signal-green">Password updated.</p>
          ) : null}
          <Button type="submit" isLoading={isSavingPassword}>
            Update password
          </Button>
        </form>
      ) : null}
    </div>
  );
}