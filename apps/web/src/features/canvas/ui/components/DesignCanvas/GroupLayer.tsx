import {
  type DesignGroup,
  GROUP_KIND_LABELS,
  type GroupKind,
} from "@repo/design";
import { useNodes, ViewportPortal } from "@xyflow/react";
import { cn } from "cn";
import { Globe, Lock, type LucideIcon, MapPin, Network } from "lucide-react";

import {
  NODE_HEIGHT,
  NODE_WIDTH,
  REGION_LABEL_HEIGHT,
  REGION_PADDING,
  REGION_TONES,
} from "@/features/canvas/constants";
import type { CanvasNode } from "@/features/canvas/typedefs";

interface GroupLayerProps {
  groups: DesignGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ICONS: Record<GroupKind, LucideIcon> = {
  region: MapPin,
  vpc: Network,
  "public-subnet": Globe,
  "private-subnet": Lock,
};

const TONES: Partial<Record<GroupKind, string>> = {
  vpc: "border-zinc-300 bg-zinc-100/40 text-zinc-700",
  "public-subnet": "border-sky-300 bg-sky-50/60 text-sky-800",
  "private-subnet": "border-emerald-300 bg-emerald-50/60 text-emerald-800",
};

const union = (a: Box | undefined, b: Box): Box =>
  a
    ? {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.max(a.x + a.width, b.x + b.width) - Math.min(a.x, b.x),
        height: Math.max(a.y + a.height, b.y + b.height) - Math.min(a.y, b.y),
      }
    : b;

const padded = (box: Box): Box => ({
  x: box.x - REGION_PADDING,
  y: box.y - REGION_PADDING - REGION_LABEL_HEIGHT,
  width: box.width + 2 * REGION_PADDING,
  height: box.height + 2 * REGION_PADDING + REGION_LABEL_HEIGHT,
});

const depthOf = (groups: DesignGroup[], group: DesignGroup): number => {
  let depth = 0;
  let current = group;
  const seen = new Set<string>();

  while (current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = groups.find(
      (candidate) => candidate.id === current.parentId,
    );

    if (!parent) break;

    depth++;
    current = parent;
  }

  return depth;
};

export function GroupLayer({ groups, selectedId, onSelect }: GroupLayerProps) {
  const nodes = useNodes<CanvasNode>();
  const inside = new Map<string, Box>();

  for (const node of nodes) {
    const groupId = node.data.node.groupId;

    if (!groupId) continue;

    inside.set(
      groupId,
      union(inside.get(groupId), {
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width ?? NODE_WIDTH,
        height: node.measured?.height ?? NODE_HEIGHT,
      }),
    );
  }

  const ordered = [...groups].sort(
    (a, b) => depthOf(groups, b) - depthOf(groups, a),
  );
  const boxes = new Map<string, Box>();

  for (const group of ordered) {
    const content = inside.get(group.id);

    if (!content) continue;

    const box = padded(content);

    boxes.set(group.id, box);

    if (group.parentId) {
      inside.set(group.parentId, union(inside.get(group.parentId), box));
    }
  }

  const regions = groups.filter((group) => group.kind === "region");

  return (
    <ViewportPortal>
      {[...ordered].reverse().map((group) => {
        const box = boxes.get(group.id);

        if (!box) return null;

        const Icon = ICONS[group.kind];
        const kind = GROUP_KIND_LABELS[group.kind];
        const tone =
          TONES[group.kind] ??
          REGION_TONES[regions.indexOf(group) % REGION_TONES.length];

        return (
          <div
            key={group.id}
            data-group={group.id}
            data-region={group.kind === "region" ? group.id : undefined}
            className={cn(
              "pointer-events-none absolute rounded-2xl border-2 border-dashed",
              tone,
              selectedId === group.id && "border-solid",
            )}
            style={{
              transform: `translate(${box.x}px, ${box.y}px)`,
              width: box.width,
              height: box.height,
            }}
          >
            <button
              type="button"
              aria-pressed={selectedId === group.id}
              aria-label={`${kind} ${group.label}`}
              onClick={() => onSelect(group.id)}
              className="nodrag nopan pointer-events-auto absolute top-2 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tracking-wide uppercase hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{group.label || kind}</span>
            </button>
          </div>
        );
      })}
    </ViewportPortal>
  );
}
