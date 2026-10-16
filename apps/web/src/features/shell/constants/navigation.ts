import type { LinkProps } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  ChartNoAxesColumn,
  ClipboardCheck,
  CreditCard,
  House,
  type LucideIcon,
  MessagesSquare,
  Network,
  PencilLine,
  Puzzle,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";

export type StaffRole = "moderator" | "admin";

interface NavItemBase {
  label: string;
  icon: LucideIcon;
  minimumRole?: StaffRole;
}

export interface NavLinkItem extends NavItemBase {
  to: NonNullable<LinkProps["to"]>;
  exact?: boolean;
}

export interface NavSoonItem extends NavItemBase {
  soon: true;
}

export type NavItem = NavLinkItem | NavSoonItem;

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAVIGATION: NavGroup[] = [
  {
    label: "Practice",
    items: [
      { label: "Home", icon: House, to: "/home" },
      { label: "Designs", icon: Network, to: "/designs" },
      { label: "Problems", icon: Puzzle, to: "/problems" },
      { label: "Handbook", icon: BookOpen, to: "/handbook" },
      { label: "Interviews", icon: MessagesSquare, to: "/interviews" },
      { label: "Progress", icon: ChartNoAxesColumn, to: "/progress" },
      { label: "Leaderboard", icon: Trophy, to: "/leaderboard" },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "My problems", icon: PencilLine, to: "/authoring" },
      {
        label: "Reviews",
        icon: ClipboardCheck,
        to: "/moderation",
        minimumRole: "moderator",
      },
    ],
  },
];

export const ACCOUNT_LINKS: NavLinkItem[] = [
  { label: "Plans", icon: Sparkles, to: "/pricing" },
  { label: "Profile", icon: UserRound, to: "/settings/profile" },
  { label: "Security", icon: ShieldCheck, to: "/settings/security" },
  { label: "Notifications", icon: Bell, to: "/settings/notifications" },
  { label: "Billing", icon: CreditCard, to: "/settings/billing" },
];
