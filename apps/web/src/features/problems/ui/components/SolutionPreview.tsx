import { type DesignGraph, migrateGraph } from "@repo/design";
import { useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { CanvasProvider, DesignCanvas } from "@/features/canvas";

interface SolutionPreviewProps {
  title: string;
  description: string;
  graph: unknown;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NOTHING = () => undefined;
const NO_ERROR = () => null;
const NO_LAYOUT = {};

export function SolutionPreview({
  title,
  description,
  graph,
  open,
  onOpenChange,
}: SolutionPreviewProps) {
  const design: DesignGraph = useMemo(() => migrateGraph(graph), [graph]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(80dvh,720px)] flex-col gap-3 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
