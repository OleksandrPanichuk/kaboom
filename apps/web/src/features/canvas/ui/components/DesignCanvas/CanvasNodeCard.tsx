import { catalogue, findTechnology, isNodeKind } from "@repo/design";
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

import { TechnologyMark } from "./TechnologyMark";

const HANDLE =
  "!size-3 !rounded-full !border-2 !border-white !bg-interactive shadow-sm transition-opacity";

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
  const Icon = definition
    ? NODE_KIND_ICONS[definition.kind]
    : FALLBACK_NODE_ICON;
  const kindLabel = definition?.label ?? node.kind;
  const product = node.technology
    ? findTechnology(node.technology.id, node.kind)
    : undefined;
  const { hits } = data;
  const warns = hits.some((hit) => hit.severity === "warning");
  const BadgeIcon = warns ? TriangleAlert : Info;
  const { overlay } = data;

  return (
    <BaseNode
      style={{ width: NODE_WIDTH }}
      data-tone={overlay?.tone}
      className="group/node rounded-xl border-border data-[tone=busy]:border-warning-border data-[tone=busy]:bg-warning-surface/60 data-[tone=down]:border-dashed data-[tone=down]:border-destructive data-[tone=down]:bg-danger-surface/60 data-[tone=ok]:border-success-border data-[tone=saturated]:border-destructive data-[tone=saturated]:bg-danger-surface/70 bg-card shadow-card hover:ring-0 in-[.selected]:border-interactive in-[.selected]:shadow-[0_0_0_3px_rgba(99,102,241,0.18)]"
    >
      <Handle type="target" position={Position.Left} className={handleClass} />
      {hits.length > 0 ? (
        <span
          role="img"
          aria-label={`${hits.length} ${hits.length === 1 ? "problem" : "problems"}: ${hits.map((hit) => hit.message).join(" ")}`}
          title={hits.map((hit) => hit.message).join("\n")}
          className={cn(
            "absolute -top-2 -right-2 grid size-5 place-items-center rounded-full border-2 border-white shadow-sm",
            warns
              ? "bg-warning text-background"
              : "bg-muted-foreground text-background",
          )}
        >
          <BadgeIcon aria-hidden="true" className="size-3" />
        </span>
      ) : null}
      <div className="flex items-center gap-2.5 p-2.5">
        {product ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card">
            <TechnologyMark technology={product} className="size-5" />
          </span>
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-interactive-border/60 bg-interactive-surface text-interactive-foreground">
            <Icon aria-hidden="true" className="size-4" />
          </span>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold tracking-[-0.01em]">
            {node.label || kindLabel}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {product?.label ?? kindLabel}
          </span>
        </div>
      </div>
      {overlay ? (
        <p
          className={cn(
            "border-t px-2.5 py-1 text-[11px] font-medium tabular-nums",
            overlay.tone === "saturated" || overlay.tone === "down"
              ? "border-danger-border text-danger-foreground"
              : overlay.tone === "busy"
                ? "border-warning-border text-warning-foreground"
                : overlay.tone === "ok"
                  ? "border-success-border text-success-foreground"
                  : "border-border text-muted-foreground",
          )}
        >
          {overlay.text}
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} className={handleClass} />
    </BaseNode>
  );
}

export const CanvasNodeCard = memo(CanvasNodeCardComponent);
