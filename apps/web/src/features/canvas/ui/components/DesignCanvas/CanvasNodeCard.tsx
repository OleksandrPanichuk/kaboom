import { catalogue, isNodeKind } from "@repo/design";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

import { BaseNode } from "@/components/flow/BaseNode";
import {
  FALLBACK_NODE_ICON,
  NODE_KIND_ICONS,
  NODE_WIDTH,
} from "@/features/canvas/constants";
import type { CanvasNode } from "@/features/canvas/typedefs";

const HIDDEN_HANDLE =
  "!size-2 !min-h-0 !min-w-0 !border-0 !bg-transparent opacity-0";

function CanvasNodeCardComponent({ data }: NodeProps<CanvasNode>) {
  const { node } = data;
  const definition = isNodeKind(node.kind) ? catalogue[node.kind] : null;
  const Icon = NODE_KIND_ICONS[definition?.icon ?? ""] ?? FALLBACK_NODE_ICON;
  const kindLabel = definition?.label ?? node.kind;

  return (
    <BaseNode
      style={{ width: NODE_WIDTH }}
      className="rounded-xl border-black/10 bg-white shadow-[0_8px_24px_-18px_rgba(24,24,27,0.5)] hover:ring-0 in-[.selected]:border-indigo-400 in-[.selected]:shadow-[0_0_0_3px_rgba(99,102,241,0.18)]"
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={HIDDEN_HANDLE}
      />
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
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={HIDDEN_HANDLE}
      />
    </BaseNode>
  );
}

export const CanvasNodeCard = memo(CanvasNodeCardComponent);
