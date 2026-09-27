import { catalogue, isNodeKind } from "@repo/design";
import { Handle, type NodeProps, Position, useConnection } from "@xyflow/react";
import { cn } from "cn";
import { Info, TriangleAlert } from "lucide-react";
import { memo } from "react";

import { BaseNode } from "@/components/flow/BaseNode";
import {
  FALLBACK_NODE_ICON,
  NODE_KIND_ICONS,
  NODE_WIDTH,
} from "@/features/canvas/constants";
import type { CanvasNode } from "@/features/canvas/typedefs";

const HANDLE =
  "!size-3 !rounded-full !border-2 !border-white !bg-indigo-500 shadow-sm transition-opacity";

function CanvasNodeCardComponent({ data }: NodeProps<CanvasNode>) {
  const { node } = data;
  const connecting = useConnection((connection) => connection.inProgress);
  const handleClass = cn(
    HANDLE,
    connecting
      ? "opacity-100"
      : "opacity-0 group-hover/node:opacity-100 group-focus-within/node:opacity-100 in-[.selected]:opacity-100",
  );
  const definition = isNodeKind(node.kind) ? catalogue[node.kind] : null;
  const Icon = NODE_KIND_ICONS[definition?.icon ?? ""] ?? FALLBACK_NODE_ICON;
  const kindLabel = definition?.label ?? node.kind;
  const { hits } = data;
  const warns = hits.some((hit) => hit.severity === "warning");
  const BadgeIcon = warns ? TriangleAlert : Info;

  return (
    <BaseNode
      style={{ width: NODE_WIDTH }}
      className="group/node rounded-xl border-black/10 bg-white shadow-[0_8px_24px_-18px_rgba(24,24,27,0.5)] hover:ring-0 in-[.selected]:border-indigo-400 in-[.selected]:shadow-[0_0_0_3px_rgba(99,102,241,0.18)]"
    >
      <Handle type="target" position={Position.Left} className={handleClass} />
      {hits.length > 0 ? (
        <span
          role="img"
          aria-label={`${hits.length} ${hits.length === 1 ? "problem" : "problems"}: ${hits.map((hit) => hit.message).join(" ")}`}
          title={hits.map((hit) => hit.message).join("\n")}
          className={cn(
            "absolute -top-2 -right-2 grid size-5 place-items-center rounded-full border-2 border-white shadow-sm",
            warns ? "bg-amber-500 text-white" : "bg-zinc-400 text-white",
          )}
        >
          <BadgeIcon aria-hidden="true" className="size-3" />
        </span>
      ) : null}
      <div className="flex items-center gap-2.5 p-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-indigo-200/60 bg-indigo-50 text-indigo-700">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold tracking-[-0.01em]">
            {node.label || kindLabel}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {node.technology ? node.technology.id : kindLabel}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className={handleClass} />
    </BaseNode>
  );
}

export const CanvasNodeCard = memo(CanvasNodeCardComponent);
