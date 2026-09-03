import type { User } from "@supabase/supabase-js";

export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export function getDisplayName(user: User | null): string {
  if (!user) return "";

  const metadata = user.user_metadata as
    | { full_name?: unknown; name?: unknown }
    | undefined;
  const metaName = metadata?.full_name ?? metadata?.name;

  if (typeof metaName === "string" && metaName.trim()) {
    return metaName.trim().split(" ")[0] ?? "";
  }

  if (user.email) return user.email.split("@")[0] ?? "";

  return "";
}

export function getAvatarUrl(user: User | null): string | null {
  if (!user) return null;

  const metadata = user.user_metadata as
    | { avatar_url?: unknown; picture?: unknown }
    | undefined;
  const url = metadata?.avatar_url ?? metadata?.picture;

  return typeof url === "string" && url.trim() ? url : null;
}