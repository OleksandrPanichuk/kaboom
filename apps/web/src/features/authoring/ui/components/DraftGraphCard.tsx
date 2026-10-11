import { type DesignGraph, migrateGraph } from "@repo/design";
import { PencilRuler } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { CanvasProvider, DesignCanvas } from "@/features/canvas";

interface DraftGraphCardProps {
  graph: unknown;
  editing?: boolean;
  onEdit?: () => void;
}

const NOTHING = () => undefined;
const NO_ERROR = () => null;
const NO_LAYOUT = {};

export function DraftGraphCard({
  graph,
  editing,
  onEdit,
}: DraftGraphCardProps) {
  const design: DesignGraph = useMemo(() => migrateGraph(graph), [graph]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-72 overflow-hidden rounded-xl border bg-background">
        {design.nodes.length === 0 ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">
            Nothing drawn yet.
          </p>
        ) : (
          <CanvasProvider>
            <DesignCanvas
              graph={design}
              layout={NO_LAYOUT}
              hits={[]}
              overlay={null}
              focus={null}
              readOnly
              onAddNode={NOTHING}
              onMoveNodes={NOTHING}
              connectionError={NO_ERROR}
              onConnect={NOTHING}
              onRefuseConnection={NOTHING}
              onDelete={NOTHING}
              onSelectionChange={NOTHING}
            />
          </CanvasProvider>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {design.nodes.length} {design.nodes.length === 1 ? "node" : "nodes"},{" "}
          {design.edges.length} {design.edges.length === 1 ? "edge" : "edges"}
        </p>
        {onEdit ? (
          <Button
            variant="outline"
            size="sm"
            disabled={editing}
            onClick={onEdit}
          >
            <PencilRuler aria-hidden="true" />
            {editing ? "Opening…" : "Edit in the designer"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
