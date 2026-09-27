import type { ReactNode } from "react";
import { usePanelRef } from "react-resizable-panels";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/Resizable";
import { useWorkspaceStore } from "@/features/shell/store";
import type {
  WorkspaceBackLink,
  WorkspaceTab,
  WorkspaceTool,
} from "@/features/shell/typedefs";

import { WorkspaceTabs } from "./WorkspaceTabs";
import { WorkspaceToolPanel } from "./WorkspaceToolPanel";
import { WorkspaceTopBar } from "./WorkspaceTopBar";

interface WorkspaceDesktopProps {
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

const toggle = (panel: ReturnType<typeof usePanelRef>["current"]) => {
  if (!panel) return;

  if (panel.isCollapsed()) panel.expand();
  else panel.collapse();
};

export function WorkspaceDesktop({
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
}: WorkspaceDesktopProps) {
  const layout = useWorkspaceStore((state) => state.layout);
  const setLayout = useWorkspaceStore((state) => state.setLayout);
  const toolRef = usePanelRef();
  const tabsRef = usePanelRef();

  return (
    <>
      <WorkspaceTopBar
        back={back}
        title={title}
        meta={meta}
        actions={actions}
        toolLabel={tool.label}
        tabsLabel={tabsLabel}
        toolOpen={layout?.tool !== 0}
        tabsOpen={layout?.tabs !== 0}
        onToggleTool={() => toggle(toolRef.current)}
        onToggleTabs={() => toggle(tabsRef.current)}
      />
      <ResizablePanelGroup
        orientation="horizontal"
        defaultLayout={layout}
        onLayoutChanged={(next, meta) =>
          setLayout(meta.requestedLayout ?? next)
        }
        className="min-h-0 flex-1"
      >
        <ResizablePanel
          id="tool"
          panelRef={toolRef}
          defaultSize={240}
          minSize={200}
          maxSize={360}
          collapsible
          collapsedSize={0}
          className="bg-background"
        >
          <WorkspaceToolPanel tool={tool} />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="canvas" minSize={320}>
          <main className="relative h-full min-w-0">{children}</main>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          id="tabs"
          panelRef={tabsRef}
          defaultSize={360}
          minSize={300}
          maxSize="50"
          collapsible
          collapsedSize={0}
          className="bg-background"
        >
          <WorkspaceTabs tabs={tabs} value={tab} onValueChange={onTabChange} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
