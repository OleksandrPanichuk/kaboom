import { isSqlEngine, writeType } from "@repo/design";
import {
  Handle,
  type NodeProps,
  Position,
  useConnection,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { cn } from "cn";
import { Info, KeyRound, Link2, Table2, TriangleAlert } from "lucide-react";
import { Fragment, memo, useEffect } from "react";

import { BaseNode } from "@/components/flow/BaseNode";
import {
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  TABLE_WIDTH,
} from "@/features/canvas/constants";
import type { CanvasNode } from "@/features/canvas/typedefs";
import { columnHandle } from "@/features/canvas/utils";

const HANDLE =
  "!size-2.5 !rounded-full !border-2 !border-white !bg-violet-500 shadow-sm transition-opacity";

function TableNodeCardComponent({ id, data }: NodeProps<CanvasNode>) {
  const { node, hits } = data;
  const connecting = useConnection((connection) => connection.inProgress);
  const updateNodeInternals = useUpdateNodeInternals();
  const order =
    node.kind === "table"
      ? node.props.columns.map((column) => column.id).join("|")
      : "";

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, order, updateNodeInternals]);
  const handleClass = cn(
    HANDLE,
    connecting
      ? "opacity-100"
      : "opacity-0 group-hover/node:opacity-100 group-focus-within/node:opacity-100 in-[.selected]:opacity-100",
  );

  if (node.kind !== "table") return null;

  const foreignKeys = new Set(data.foreignKeys ?? []);
  const warns = hits.some((hit) => hit.severity === "warning");
  const BadgeIcon = warns ? TriangleAlert : Info;
  const { columns } = node.props;

  return (
    <BaseNode
      style={{ width: TABLE_WIDTH }}
      className="group/node overflow-visible rounded-xl border-border bg-card shadow-card hover:ring-0 in-[.selected]:border-violet-400 in-[.selected]:shadow-[0_0_0_3px_rgba(139,92,246,0.18)]"
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
        className="flex items-center gap-2 rounded-t-xl border-b border-border bg-violet-50/70 px-3"
        style={{ height: TABLE_HEADER_HEIGHT }}
      >
        <Table2
          aria-hidden="true"
          className="size-4 shrink-0 text-violet-700"
        />
        <span className="truncate font-mono text-sm font-semibold tracking-[-0.01em]">
          {node.label || node.id}
        </span>
      </div>
      {columns.length === 0 ? (
        <p
          className="flex items-center px-3 text-xs text-muted-foreground"
          style={{ height: TABLE_ROW_HEIGHT }}
        >
          No columns yet
        </p>
      ) : (
        <ul>
          {columns.map((column) => (
            <li
              key={column.id}
              className="relative flex items-center gap-1.5 px-3 text-xs not-last:border-b not-last:border-border"
              style={{ height: TABLE_ROW_HEIGHT }}
            >
              {(["left", "right"] as const).map((edge) => (
                <Fragment key={edge}>
                  <Handle
                    id={columnHandle(column.id, "in", edge)}
                    type="target"
                    position={edge === "left" ? Position.Left : Position.Right}
                    className={handleClass}
                  />
                  <Handle
                    id={columnHandle(column.id, "out", edge)}
                    type="source"
                    position={edge === "left" ? Position.Left : Position.Right}
                    className={handleClass}
                  />
                </Fragment>
              ))}
              <span className="flex w-3.5 shrink-0 justify-center">
                {column.primaryKey ? (
                  <KeyRound
                    aria-label="Primary key"
                    className="size-3 text-warning"
                  />
                ) : foreignKeys.has(column.id) ? (
                  <Link2
                    aria-label="Foreign key"
                    className="size-3 text-violet-600"
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "min-w-0 truncate font-mono",
                  column.primaryKey && "font-semibold",
                )}
              >
                {column.name}
                {column.nullable ? (
                  <span className="text-muted-foreground">?</span>
                ) : null}
              </span>
              {column.unique && !column.primaryKey ? (
                <span className="shrink-0 rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                  unique
                </span>
              ) : null}
              {column.generated?.kind === "identity" ||
              column.default?.kind === "uuid" ? (
                <span
                  title="Fills itself in"
                  className="shrink-0 rounded bg-sky-50 px-1 text-[10px] font-medium text-sky-700"
                >
                  auto
                </span>
              ) : null}
              <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                {column.type !== "enum" &&
                data.engine &&
                isSqlEngine(data.engine)
                  ? writeType(data.engine, column)
                  : column.type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </BaseNode>
  );
}

export const TableNodeCard = memo(TableNodeCardComponent);
