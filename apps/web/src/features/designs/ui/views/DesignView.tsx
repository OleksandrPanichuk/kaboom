import { useSuspenseQuery } from "@tanstack/react-query";
import { Blocks, Play, SlidersHorizontal } from "lucide-react";

import { designQuery } from "@/features/designs/api";
import {
  CanvasPlaceholder,
  PanelPlaceholder,
} from "@/features/designs/ui/components";
import { WorkspaceLayout } from "@/features/shell";

interface DesignViewProps {
  designId: string;
}

export function DesignView({ designId }: DesignViewProps) {
  const { data: design } = useSuspenseQuery(designQuery(designId));

  return (
    <WorkspaceLayout
      back={{ to: "/designs", label: "Designs" }}
      title={design.name}
      meta={`Revision ${design.revision}`}
      tool={{
        label: "Nodes",
        content: (
          <PanelPlaceholder
            icon={Blocks}
            title="No nodes yet"
            description="Services, databases, caches and queues will be listed here to drag onto the canvas."
          />
        ),
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
      <CanvasPlaceholder />
    </WorkspaceLayout>
  );
}
