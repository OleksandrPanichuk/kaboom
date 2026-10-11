import { Handle, type NodeProps, Position, useConnection } from "@xyflow/react";
import { cn } from "cn";
import { FileJson, Info, KeyRound, Link2, TriangleAlert } from "lucide-react";
import { Fragment, memo } from "react";

import { BaseNode } from "@/components/flow/BaseNode";
import {
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  TABLE_WIDTH,
} from "@/features/canvas/constants";
import type { CanvasNode } from "@/features/canvas/typedefs";
import {
  columnHandle,
  documentRows,
  fieldTypeLabel,
  holdsIds,
} from "@/features/canvas/utils";

const HANDLE =
  "!size-2.5 !rounded-full !border-2 !border-white !bg-emerald-500 shadow-sm transition-opacity";

const SIDES = ["left", "right"] as const;

function CollectionNodeCardComponent({ data }: NodeProps<CanvasNode>) {
  const { node, hits } = data;
  const connecting = useConnection((connection) => connection.inProgress);
  const handleClass = cn(
    HANDLE,
    connecting
      ? "opacity-100"
      : "opacity-0 group-hover/node:opacity-100 group-focus-within/node:opacity-100 in-[.selected]:opacity-100",
  );

  if (node.kind !== "collection") return null;

  const rows = documentRows(node.props.fields);
  const referencing = new Set(data.foreignKeys ?? []);
  const warns = hits.some((hit) => hit.severity === "warning");
  const BadgeIcon = warns ? TriangleAlert : Info;

  return (
    <BaseNode
      style={{ width: TABLE_WIDTH }}
      className="group/node overflow-visible rounded-xl border-black/10 bg-white shadow-[0_8px_24px_-18px_rgba(24,24,27,0.5)] hover:ring-0 in-[.selected]:border-emerald-400 in-[.selected]:shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
    >
      {hits.length > 0 ? (
        <span
          role="img"
          aria-label={`${hits.length} ${hits.length === 1 ? "problem" : "problems"}: ${hits.map((hit) => hit.message).join(" ")}`}
          title={hits.map((hit) => hit.message).join("\n")}
          className={cn(
            "absolute -top-2 -right-2 z-10 grid size-5 place-items-center rounded-full border-2 border-white shadow-sm",
            warns ? "bg-amber-500 text-white" : "bg-zinc-400 text-white",
          )}
        >
          <BadgeIcon aria-hidden="true" className="size-3" />
        </span>
      ) : null}
      <div
        className="flex items-center gap-2 rounded-t-xl border-b border-black/[0.07] bg-emerald-50/70 px-3"
        style={{ height: TABLE_HEADER_HEIGHT }}
      >
        <FileJson
          aria-hidden="true"
          className="size-4 shrink-0 text-emerald-700"
        />
        <span className="truncate font-mono text-sm font-semibold tracking-[-0.01em]">
          {node.label || node.id}
        </span>
      </div>
      <ul>
        <li
          className="relative flex items-center gap-1.5 border-b border-black/[0.05] px-3 text-xs"
          style={{ height: TABLE_ROW_HEIGHT }}
        >
          {SIDES.map((side) => (
            <Handle
              key={side}
              id={columnHandle("_id", "in", side)}
              type="target"
              position={side === "left" ? Position.Left : Position.Right}
              className={handleClass}
            />
          ))}
          <KeyRound
            aria-label="Document id"
            className="size-3 shrink-0 text-amber-600"
          />
          <span className="font-mono font-semibold">_id</span>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            objectId
          </span>
        </li>
        {rows.map((row) => {
          const id = row.path.join(".");

          return (
            <li
              key={id}
              className="relative flex items-center gap-1.5 px-3 text-xs not-last:border-b not-last:border-black/[0.05]"
              style={{
                height: TABLE_ROW_HEIGHT,
                paddingLeft: 12 + row.depth * 14,
              }}
            >
              {holdsIds(row.field)
                ? SIDES.map((side) => (
                    <Fragment key={side}>
                      <Handle
                        id={columnHandle(id, "out", side)}
                        type="source"
                        position={
                          side === "left" ? Position.Left : Position.Right
                        }
                        className={handleClass}
                      />
                    </Fragment>
                  ))
                : null}
              <span className="flex w-3.5 shrink-0 justify-center">
                {referencing.has(id) ? (
                  <Link2
                    aria-label="References another collection"
                    className="size-3 text-emerald-600"
                  />
                ) : null}
              </span>
              <span className="min-w-0 truncate font-mono">
                {row.field.name}
                {row.field.required ? null : (
                  <span className="text-muted-foreground">?</span>
                )}
              </span>
              <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                {fieldTypeLabel(row.field)}
              </span>
            </li>
          );
        })}
      </ul>
    </BaseNode>
  );
}

export const CollectionNodeCard = memo(CollectionNodeCardComponent);
