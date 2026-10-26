import {
  CalendarDays,
  LayoutDashboard,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trades", label: "Trades", icon: NotebookPen },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
];

export const ACCOUNT_PATHS = ["/profile", "/settings", "/billing"];