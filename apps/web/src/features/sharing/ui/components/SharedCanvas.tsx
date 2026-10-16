import { type DesignGraph, migrateGraph } from "@repo/design";
import { useMemo } from "react";

import { CanvasProvider, DesignCanvas } from "@/features/canvas";

interface SharedCanvasProps {
  graph: unknown;
  layout: Record<string, { x: number; y: number }>;
}

const NOTHING = () => undefined;
const NO_ERROR = () => null;

export function SharedCanvas({ graph, layout }: SharedCanvasProps) {
  const design: DesignGraph = useMemo(() => migrateGraph(graph), [graph]);

  return (
    <div className="relative h-[60dvh] min-h-[22rem] overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <CanvasProvider>
        <DesignCanvas
          graph={design}
          layout={layout}
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
    </div>
  );
}
