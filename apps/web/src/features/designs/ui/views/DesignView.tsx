import { useSuspenseQuery } from "@tanstack/react-query";
import { Play, Redo2, SlidersHorizontal, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  CanvasNotice,
  CanvasProvider,
  DesignCanvas,
  NodePalette,
} from "@/features/canvas";
import { designQuery } from "@/features/designs/api";
import { useDesignEditor, useHistoryShortcuts } from "@/features/designs/hooks";
import { PanelPlaceholder } from "@/features/designs/ui/components";
import { WorkspaceLayout } from "@/features/shell";

interface DesignViewProps {
  designId: string;
}

export function DesignView({ designId }: DesignViewProps) {
  const { data: design } = useSuspenseQuery(designQuery(designId));
  const editor = useDesignEditor(designId);

  useHistoryShortcuts(editor.undo, editor.redo);

  return (
    <CanvasProvider>
      <WorkspaceLayout
        back={{ to: "/designs", label: "Designs" }}
        title={design.name}
        meta={
          <span aria-live="polite">
            Revision {editor.revision}
            {editor.saving ? " · Saving…" : ""}
          </span>
        }
        actions={
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Undo"
              title="Undo (⌘Z)"
              disabled={!editor.canUndo}
              onClick={editor.undo}
            >
              <Undo2 aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Redo"
              title="Redo (⇧⌘Z)"
              disabled={!editor.canRedo}
              onClick={editor.redo}
            >
              <Redo2 aria-hidden="true" />
            </Button>
          </div>
        }
        tool={{
          label: "Nodes",
          content: <NodePalette onAdd={editor.addNode} />,
        }}
        tabsLabel="Inspector"
        tabs={[
          {
            id: "node",
            label: "Node",
            icon: SlidersHorizontal,
            content: (
              <PanelPlaceholder
                icon={SlidersHorizontal}
                title="Nothing selected"
                description="Select a node on the canvas to edit its properties here."
              />
            ),
          },
          {
            id: "run",
            label: "Run",
            icon: Play,
            content: (
              <PanelPlaceholder
                icon={Play}
                title="No runs yet"
                description="Run the design under load to see where it bends and where it breaks."
              />
            ),
          },
        ]}
      >
        <DesignCanvas
          graph={editor.graph}
          layout={editor.layout}
          onAddNode={editor.addNode}
          onMoveNodes={editor.moveNodes}
          connectionError={editor.connectionError}
          onConnect={editor.connect}
          onRefuseConnection={editor.reportError}
          onDelete={editor.remove}
        />
        {editor.error ? (
          <CanvasNotice
            message={editor.error}
            onDismiss={editor.dismissError}
          />
        ) : null}
      </WorkspaceLayout>
    </CanvasProvider>
  );
}
