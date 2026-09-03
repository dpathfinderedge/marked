import { Link } from "react-router-dom";
import { Sun, Moon, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { Stamp } from "@/components/ui/Stamp";
import { getDisplayName, getAvatarUrl } from "@/utils/greeting";

function getInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export function MobileTopBar(): JSX.Element {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const displayName = getDisplayName(user);
  const avatarUrl = getAvatarUrl(user);

  const handleSignOut = async (): Promise<void> => {
    const { error } = await signOut();
    if (error) showToast(error.message, "error");
  };

  return (
    <header className="flex items-center justify-between border-b border-line bg-bg-0 px-4 py-3 sm:hidden">
      <div className="flex items-center gap-2">
        <Stamp size={22} className="text-signal-red" />
        <span className="text-[15px] font-semibold tracking-tight text-text">
          Marked
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-2 hover:text-text"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-2 hover:text-text"
        >
          <LogOut size={18} />
        </button>

        <Link
          to="/profile"
          aria-label="Profile"
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-full"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-red text-[13px] font-semibold text-white">
              {getInitial(displayName)}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}