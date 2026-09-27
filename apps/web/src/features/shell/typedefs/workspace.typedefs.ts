import type { LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface WorkspaceBackLink {
  to: NonNullable<LinkProps["to"]>;
  label: string;
}

export interface WorkspaceTool {
  label: string;
  content: ReactNode;
}

export interface WorkspaceTab {
  id: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
  badge?: number;
}
