import type { LinkProps } from "@tanstack/react-router";
import {
  ChartNoAxesColumn,
  House,
  type LucideIcon,
  MessagesSquare,
  Network,
  ShieldCheck,
} from "lucide-react";

interface NavItemBase {
  label: string;
  icon: LucideIcon;
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
      { label: "Home", icon: House, to: "/", exact: true },
      { label: "Designs", icon: Network, soon: true },
      { label: "Interviews", icon: MessagesSquare, soon: true },
      { label: "Progress", icon: ChartNoAxesColumn, soon: true },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Security", icon: ShieldCheck, to: "/settings/security" }],
  },
];
