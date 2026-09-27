import { useSuspenseQuery } from "@tanstack/react-query";
import { Play, SlidersHorizontal } from "lucide-react";

import {
  CanvasNotice,
  CanvasProvider,
  DesignCanvas,
  NodePalette,
} from "@/features/canvas";
import { designQuery } from "@/features/designs/api";
import { useDesignEditor } from "@/features/designs/hooks";
import { PanelPlaceholder } from "@/features/designs/ui/components";
import { WorkspaceLayout } from "@/features/shell";

interface DesignViewProps {
  designId: string;
}

export function DesignView({ designId }: DesignViewProps) {
  const { data: design } = useSuspenseQuery(designQuery(designId));
  const editor = useDesignEditor(designId);

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
