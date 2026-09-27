import { type ReactNode, useState } from "react";

import { useIsCompactWorkspace } from "@/features/shell/hooks";
import type {
  WorkspaceBackLink,
  WorkspaceTab,
  WorkspaceTool,
} from "@/features/shell/typedefs";
import {
  WorkspaceCompact,
  WorkspaceDesktop,
} from "@/features/shell/ui/components";

interface WorkspaceLayoutProps {
  back: WorkspaceBackLink;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  tool: WorkspaceTool;
  tabs: WorkspaceTab[];
  tabsLabel: string;
  tab?: string;
  onTabChange?: (tab: string) => void;
  children: ReactNode;
}

export function WorkspaceLayout({
  tabs,
  tab: controlledTab,
  onTabChange,
  ...props
}: WorkspaceLayoutProps) {
  const compact = useIsCompactWorkspace();
  const [ownTab, setOwnTab] = useState(tabs[0]?.id ?? "");
  const tab = controlledTab ?? ownTab;

  const changeTab = (next: string) => {
    setOwnTab(next);
    onTabChange?.(next);
  };

  const Frame = compact ? WorkspaceCompact : WorkspaceDesktop;

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <Frame {...props} tabs={tabs} tab={tab} onTabChange={changeTab} />
    </div>
  );
}
