import {
  Calculator,
  CalendarDays,
  LayoutDashboard,
  Newspaper,
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
  { to: "/calculator", label: "Calculator", icon: Calculator },
];

export const SECONDARY_NAV: NavItem[] = [
  { to: "/news", label: "News", icon: Newspaper },
];

export const ACCOUNT_PATHS = ["/profile", "/settings", "/billing"];