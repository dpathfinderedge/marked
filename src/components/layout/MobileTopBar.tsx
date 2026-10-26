import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Stamp } from "@/components/ui/Stamp";
import { getAvatarUrl, getDisplayName } from "@/utils/greeting";

function getInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export function MobileTopBar(): JSX.Element {
  const { user } = useAuth();
  const displayName = getDisplayName(user);
  const avatarUrl = getAvatarUrl(user);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg-0/90 px-4 py-3 backdrop-blur-md sm:hidden">
      <div className="flex items-center gap-2">
        <Stamp size={22} className="text-signal-red" />
        <span className="text-[15px] font-semibold tracking-tight text-text">
          Marked
        </span>
      </div>

      <Link
        to="/profile"
        aria-label="Profile"
        className="flex h-9 w-9 items-center justify-center rounded-full"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-red text-[13px] font-semibold text-white">
            {getInitial(displayName)}
          </span>
        )}
      </Link>
    </header>
  );
}