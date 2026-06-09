import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  FlaskConical,
  LayoutDashboard,
  Newspaper,
  ScrollText,
  Settings2,
  UsersRound
} from "lucide-react";

export type PageId =
  | "dashboard"
  | "simulation"
  | "policies"
  | "citizens"
  | "analytics"
  | "news"
  | "agents"
  | "settings";

export type NavItem = {
  id: PageId;
  label: string;
  href: string;
  icon: LucideIcon;
  section: "Command" | "City Ops" | "Intelligence" | "System";
  description: string;
};

export const navigationItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "Command",
    description: "Live civic command center"
  },
  {
    id: "simulation",
    label: "Simulation",
    href: "/simulation",
    icon: FlaskConical,
    section: "Command",
    description: "Scenario models and city twins"
  },
  {
    id: "policies",
    label: "Policies",
    href: "/policies",
    icon: ScrollText,
    section: "City Ops",
    description: "Policy impact and approvals"
  },
  {
    id: "citizens",
    label: "Citizens",
    href: "/citizens",
    icon: UsersRound,
    section: "City Ops",
    description: "Services, requests, sentiment"
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    section: "Intelligence",
    description: "Forecasts and performance"
  },
  {
    id: "news",
    label: "News",
    href: "/news",
    icon: Newspaper,
    section: "Intelligence",
    description: "Briefings and public signals"
  },
  {
    id: "agents",
    label: "Agents",
    href: "/agents",
    icon: Bot,
    section: "System",
    description: "AI agent orchestration"
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings2,
    section: "System",
    description: "Workspace and governance"
  }
];

export const navSections = ["Command", "City Ops", "Intelligence", "System"] as const;

export function getActiveNavItem(pathname: string) {
  return (
    navigationItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ??
    navigationItems[0]
  );
}
