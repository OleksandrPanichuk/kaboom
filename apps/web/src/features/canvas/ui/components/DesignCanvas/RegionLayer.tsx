import type { DesignGroup } from "@repo/design";
import { useNodes, ViewportPortal } from "@xyflow/react";
import { cn } from "cn";
import { MapPin } from "lucide-react";

import {
  NODE_HEIGHT,
  NODE_WIDTH,
  REGION_LABEL_HEIGHT,
  REGION_PADDING,
  REGION_TONES,
} from "@/features/canvas/constants";
import type { CanvasNode } from "@/features/canvas/typedefs";

interface RegionLayerProps {
  regions: DesignGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function RegionLayer({
  regions,
  selectedId,
  onSelect,
}: RegionLayerProps) {
  const nodes = useNodes<CanvasNode>();
  const boxes = new Map<string, Box>();

  for (const node of nodes) {
    const groupId = node.data.node.groupId;

    if (!groupId) continue;

    const width = node.measured?.width ?? NODE_WIDTH;
    const height = node.measured?.height ?? NODE_HEIGHT;
    const left = node.position.x - REGION_PADDING;
    const top = node.position.y - REGION_PADDING - REGION_LABEL_HEIGHT;
    const right = node.position.x + width + REGION_PADDING;
    const bottom = node.position.y + height + REGION_PADDING;
    const box = boxes.get(groupId);

    boxes.set(
      groupId,
      box
        ? {
            x: Math.min(box.x, left),
            y: Math.min(box.y, top),
            width: Math.max(box.x + box.width, right) - Math.min(box.x, left),
            height: Math.max(box.y + box.height, bottom) - Math.min(box.y, top),
          }
        : { x: left, y: top, width: right - left, height: bottom - top },
    );
  }

  return (
    <ViewportPortal>
      {regions.map((region, index) => {
        const box = boxes.get(region.id);

        if (!box) return null;

        return (
          <div
            key={region.id}
            data-region={region.id}
            className={cn(
              "pointer-events-none absolute rounded-2xl border-2 border-dashed",
              REGION_TONES[index % REGION_TONES.length],
              selectedId === region.id && "border-solid",
            )}
            style={{
              transform: `translate(${box.x}px, ${box.y}px)`,
              width: box.width,
              height: box.height,
            }}
          >
            <button
              type="button"
              aria-pressed={selectedId === region.id}
              aria-label={`Region ${region.label}`}
              onClick={() => onSelect(region.id)}
              className="nodrag nopan pointer-events-auto absolute top-2 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tracking-wide uppercase hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{region.label || "Region"}</span>
            </button>
          </div>
        );
      })}
    </ViewportPortal>
  );
}
