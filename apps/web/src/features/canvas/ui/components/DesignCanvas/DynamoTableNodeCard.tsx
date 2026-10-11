import type { NodeProps } from "@xyflow/react";
import { cn } from "cn";
import {
  ArrowDownWideNarrow,
  Box,
  Info,
  KeyRound,
  KeySquare,
  Layers,
  TriangleAlert,
} from "lucide-react";
import { memo } from "react";

import { BaseNode } from "@/components/flow/BaseNode";
import {
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  TABLE_WIDTH,
} from "@/features/canvas/constants";
import type { CanvasNode } from "@/features/canvas/typedefs";
import { type DynamoRow, dynamoRows } from "@/features/canvas/utils";

const ROW =
  "flex items-center gap-1.5 px-3 text-xs not-last:border-b not-last:border-border";

function Row({ row }: { row: DynamoRow }) {
  switch (row.kind) {
    case "no-key":
      return (
        <span className="text-muted-foreground italic">No partition key</span>
      );
    case "key":
      return (
        <>
          {row.role === "partition" ? (
            <KeyRound
              aria-label="Partition key"
              className="size-3 shrink-0 text-warning"
            />
          ) : (
            <ArrowDownWideNarrow
              aria-label="Sort key"
              className="size-3 shrink-0 text-warning"
            />
          )}
          <span className="min-w-0 truncate font-mono font-semibold">
            {row.name}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
            {row.role} · {row.type}
          </span>
        </>
      );
    case "index":
      return (
        <>
          <Layers
            aria-label={
              row.index.kind === "global" ? "Global index" : "Local index"
            }
            className="size-3 shrink-0 text-sky-600"
          />
          <span className="min-w-0 truncate font-mono">{row.index.name}</span>
          <span className="ml-auto min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            {row.keys}
          </span>
        </>
      );
    case "item":
      return (
        <>
          <Box
            aria-label="Item type"
            className="size-3 shrink-0 text-warning"
          />
          <span className="shrink-0 font-mono font-medium">
            {row.item.name}
          </span>
          <span
            className="ml-auto min-w-0 truncate font-mono text-[11px] text-muted-foreground"
            title={row.keys}
          >
            {row.keys || "no keys"}
          </span>
        </>
      );
  }
}

function DynamoTableNodeCardComponent({ data }: NodeProps<CanvasNode>) {
  const { node, hits } = data;

  if (node.kind !== "dynamo-table") return null;

  const warns = hits.some((hit) => hit.severity === "warning");
  const BadgeIcon = warns ? TriangleAlert : Info;

  return (
    <BaseNode
      style={{ width: TABLE_WIDTH }}
      className="group/node overflow-visible rounded-xl border-border bg-card shadow-card hover:ring-0 in-[.selected]:border-warning in-[.selected]:shadow-[0_0_0_3px_rgba(251,146,60,0.2)]"
    >
      {hits.length > 0 ? (
        <span
          role="img"
          aria-label={`${hits.length} ${hits.length === 1 ? "problem" : "problems"}: ${hits.map((hit) => hit.message).join(" ")}`}
          title={hits.map((hit) => hit.message).join("\n")}
          className={cn(
            "absolute -top-2 -right-2 z-10 grid size-5 place-items-center rounded-full border-2 border-white shadow-sm",
            warns
              ? "bg-warning text-background"
              : "bg-muted-foreground text-background",
          )}
        >
          <BadgeIcon aria-hidden="true" className="size-3" />
        </span>
      ) : null}
      <div
        className="flex items-center gap-2 rounded-t-xl border-b border-border bg-warning-surface/70 px-3"
        style={{ height: TABLE_HEADER_HEIGHT }}
      >
        <KeySquare
          aria-hidden="true"
          className="size-4 shrink-0 text-warning-foreground"
        />
        <span className="truncate font-mono text-sm font-semibold tracking-[-0.01em]">
          {node.label || node.id}
        </span>
      </div>
      <ul>
        {dynamoRows(node).map((row) => (
          <li
            key={row.id}
            className={cn(ROW, row.kind === "item" && "bg-warning-surface/30")}
            style={{ height: TABLE_ROW_HEIGHT }}
          >
            <Row row={row} />
          </li>
        ))}
      </ul>
    </BaseNode>
  );
}

export const DynamoTableNodeCard = memo(DynamoTableNodeCardComponent);
