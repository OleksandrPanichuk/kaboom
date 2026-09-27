import type { DesignEdge } from "@repo/design";
import { ArrowRight, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EDGE_KIND_STYLES } from "@/features/canvas";

interface EdgeInspectorProps {
  edge: DesignEdge;
  fromLabel: string;
  toLabel: string;
  onDelete: () => void;
}

export function EdgeInspector({
  edge,
  fromLabel,
  toLabel,
  onDelete,
}: EdgeInspectorProps) {
  const kind = EDGE_KIND_STYLES[edge.kind];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {kind.label}
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <span className="truncate">{fromLabel}</span>
          <ArrowRight
            aria-label="to"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <span className="truncate">{toLabel}</span>
        </p>
      </div>
      <p className="text-sm leading-5 text-muted-foreground">
        Changing an edge&apos;s kind, share and timeout arrives in the next
        update.
      </p>
      <Button
        variant="outline"
        className="w-full text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 aria-hidden="true" />
        Delete edge
      </Button>
    </div>
  );
}
