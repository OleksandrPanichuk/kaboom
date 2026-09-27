import { type ReactNode, useMemo, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { WorkspacePanelsContext } from "@/features/shell/hooks";
import type {
  WorkspaceBackLink,
  WorkspaceTab,
  WorkspaceTool,
} from "@/features/shell/typedefs";

import { WorkspaceTabs } from "./WorkspaceTabs";
import { WorkspaceTopBar } from "./WorkspaceTopBar";

interface WorkspaceCompactProps {
  back: WorkspaceBackLink;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  tool: WorkspaceTool;
  tabs: WorkspaceTab[];
  tabsLabel: string;
  tab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
}

type OpenSheet = "tool" | "tabs" | null;

export function WorkspaceCompact({
  back,
  title,
  meta,
  actions,
  tool,
  tabs,
  tabsLabel,
  tab,
  onTabChange,
  children,
}: WorkspaceCompactProps) {
  const [sheet, setSheet] = useState<OpenSheet>(null);

  const panels = useMemo(() => ({ closePanels: () => setSheet(null) }), []);

  const show = (next: Exclude<OpenSheet, null>) =>
    setSheet((current) => (current === next ? null : next));

  return (
    <WorkspacePanelsContext value={panels}>
      <WorkspaceTopBar
        back={back}
        title={title}
        meta={meta}
        actions={actions}
        toolLabel={tool.label}
        tabsLabel={tabsLabel}
        toolOpen={sheet === "tool"}
        tabsOpen={sheet === "tabs"}
        onToggleTool={() => show("tool")}
        onToggleTabs={() => show("tabs")}
      />
      <main className="relative min-h-0 flex-1">{children}</main>

      <Sheet
        open={sheet === "tool"}
        onOpenChange={(open) => setSheet(open ? "tool" : null)}
      >
        <SheetContent
          side="left"
          className="gap-0 p-0 data-[side=left]:w-72 data-[side=left]:sm:max-w-xs"
        >
          <SheetHeader className="border-b">
            <SheetTitle>{tool.label}</SheetTitle>
            <SheetDescription className="sr-only">
              {tool.label} for {title}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">{tool.content}</div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={sheet === "tabs"}
        onOpenChange={(open) => setSheet(open ? "tabs" : null)}
      >
        <SheetContent
          side="bottom"
          className="gap-0 rounded-t-2xl p-0 data-[side=bottom]:h-[80svh] [&_[data-slot=tabs-list]]:pr-12"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{tabsLabel}</SheetTitle>
            <SheetDescription>
              {tabsLabel} for {title}
            </SheetDescription>
          </SheetHeader>
          <WorkspaceTabs tabs={tabs} value={tab} onValueChange={onTabChange} />
        </SheetContent>
      </Sheet>
    </WorkspacePanelsContext>
  );
}
