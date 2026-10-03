import {
  catalogue,
  type NodeKind,
  type Track,
  TRACK_LABELS,
} from "@repo/design";
import { useReactFlow } from "@xyflow/react";
import type { DragEvent } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import {
  CANVAS_ELEMENT_ID,
  FALLBACK_NODE_ICON,
  NODE_HEIGHT,
  NODE_KIND_ICONS,
  NODE_KIND_MIME,
  NODE_WIDTH,
  PALETTE_GROUPS,
} from "@/features/canvas/constants";
import { findFreeSpot } from "@/features/canvas/utils";
import { useWorkspacePanels } from "@/features/shell";

interface NodePaletteProps {
  track?: Track;
  onAdd: (kind: NodeKind, position: { x: number; y: number }) => void;
}

export function NodePalette({ track, onAdd }: NodePaletteProps) {
  const flow = useReactFlow();
  const { closePanels } = useWorkspacePanels();

  const addInTheMiddle = (kind: NodeKind) => {
    const canvas = document.getElementById(CANVAS_ELEMENT_ID);
    const rect = canvas?.getBoundingClientRect();
    const centre = rect
      ? flow.screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        })
      : { x: 0, y: 0 };
    const wanted = {
      x: centre.x - NODE_WIDTH / 2,
      y: centre.y - NODE_HEIGHT / 2,
    };
    const taken = flow.getNodes().map((node) => node.position);

    onAdd(kind, findFreeSpot(taken, wanted));
    closePanels();
  };

  const startDrag = (event: DragEvent<HTMLButtonElement>, kind: NodeKind) => {
    event.dataTransfer.setData(NODE_KIND_MIME, kind);
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <TooltipProvider delay={500}>
      <div className="flex flex-col gap-5 p-3">
        <p className="px-1 text-xs leading-5 text-muted-foreground">
          Drag a node onto the canvas, or click it to place it in the middle.
        </p>
        {PALETTE_GROUPS.filter(
          (group) => track === undefined || group.track === track,
        ).map((group, index, shown) => (
          <section
            key={`${group.track}:${group.label}`}
            className="flex flex-col gap-1"
          >
            {track === undefined && shown[index - 1]?.track !== group.track ? (
              <h2 className="px-1 pt-1 text-sm font-semibold">
                {TRACK_LABELS[group.track]}
              </h2>
            ) : null}
            <h3 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </h3>
            <ul className="flex flex-col gap-1">
              {group.kinds.map((kind) => {
                const definition = catalogue[kind];
                const Icon =
                  NODE_KIND_ICONS[definition.icon] ?? FALLBACK_NODE_ICON;

                return (
                  <li key={kind}>
                    <Tooltip>
                      <TooltipTrigger
                        render={<button type="button" />}
                        draggable
                        onDragStart={(event) => startDrag(event, kind)}
                        onClick={() => addInTheMiddle(kind)}
                        aria-label={`Add ${definition.label}`}
                        className="flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-transparent p-1.5 text-left text-sm transition-colors hover:border-black/10 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-indigo-200/60 bg-indigo-50 text-indigo-700">
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <span className="truncate font-medium">
                          {definition.label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        sideOffset={8}
                        className="max-w-60 leading-5"
                      >
                        {definition.docs.summary}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </TooltipProvider>
  );
}
