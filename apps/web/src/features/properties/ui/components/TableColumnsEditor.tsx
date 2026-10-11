import {
  type DesignEdge,
  type DesignOp,
  type Engine,
  engineTypes,
  isSqlEngine,
} from "@repo/design";
import { cn } from "cn";
import { ArrowDown, ArrowUp, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  addColumn,
  columnNameProblem,
  type ColumnPatch,
  moveColumn,
  readableRefusal,
  removeColumn,
  retype,
  type TableNode,
  updateColumn,
  usesColumn,
} from "@/features/properties/utils";

import { ColumnDetails } from "./ColumnDetails";
import { DraftInput } from "./DraftInput";
import type { CommitResult } from "./PropFieldControl";

interface TableColumnsEditorProps {
  table: TableNode;
  engine: Engine;
  edges: readonly DesignEdge[];
  onApply: (ops: DesignOp[]) => CommitResult;
}

const FLAGS = [
  { key: "primaryKey", label: "Key", title: "Part of the primary key" },
  { key: "unique", label: "Unique", title: "No two rows share a value" },
  { key: "nullable", label: "Null", title: "May be left empty" },
] as const;

export function TableColumnsEditor({
  table,
  engine,
  edges,
  onApply,
}: TableColumnsEditorProps) {
  const available = isSqlEngine(engine) ? engineTypes(engine) : [];
  const id = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const { columns } = table.props;

  const apply = (ops: DesignOp[] | DesignOp | null) => {
    if (ops === null) return;

    const refused = onApply(Array.isArray(ops) ? ops : [ops]);

    setError(refused === null ? null : readableRefusal(refused));
  };

  const setColumnError = (columnId: string, message: string | null) =>
    setErrors((current) => {
      const { [columnId]: _, ...rest } = current;

      return message ? { ...rest, [columnId]: message } : rest;
    });

  const typesFor = (current: (typeof available)[number]) =>
    available.includes(current) ? available : [...available, current];

  const patch = (columnId: string, next: ColumnPatch) =>
    apply(updateColumn(table, columnId, next));

  return (
    <div className="flex flex-col gap-2">
      {columns.length === 0 ? (
        <p className="text-sm leading-5 text-muted-foreground">
          No columns yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {columns.map((column, position) => {
            const nameId = `${id}-${column.id}-name`;
            const relations = edges.filter((edge) =>
              usesColumn(edge, table.id, column.id),
            ).length;

            return (
              <li
                key={column.id}
                className="flex flex-col gap-2 rounded-xl border border-black/[0.07] bg-white p-2.5"
              >
                <div className="flex min-w-0 gap-2">
                  <div className="min-w-0 flex-1">
                    <DraftInput
                      id={nameId}
                      value={column.name}
                      maxLength={63}
                      invalid={errors[column.id] !== undefined}
                      describedBy={
                        errors[column.id] ? `${nameId}-error` : undefined
                      }
                      onUnchanged={() => setColumnError(column.id, null)}
                      onCommit={(text) => {
                        const name = text.trim();
                        const problem = columnNameProblem(
                          table,
                          column.id,
                          name,
                        );

                        setColumnError(column.id, problem);

                        if (!problem) patch(column.id, { name });
                      }}
                    />
                  </div>
                  <Select
                    value={column.type}
                    items={typesFor(column.type).map((type) => ({
                      value: type,
                      label: type,
                    }))}
                    onValueChange={(type) => {
                      if (type) patch(column.id, retype(column, type));
                    }}
                  >
                    <SelectTrigger
                      aria-label={`Type of ${column.name}`}
                      className="w-[7.5rem] shrink-0 font-mono text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typesFor(column.type).map((type) => (
                        <SelectItem
                          key={type}
                          value={type}
                          className="font-mono text-xs"
                        >
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {FLAGS.map((flag) => {
                    const on = column[flag.key];
                    const locked = flag.key === "nullable" && column.primaryKey;

                    return (
                      <Button
                        key={flag.key}
                        variant="outline"
                        size="xs"
                        aria-pressed={on}
                        title={flag.title}
                        disabled={locked}
                        className={cn(
                          on &&
                            "border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100",
                        )}
                        onClick={() => patch(column.id, { [flag.key]: !on })}
                      >
                        {flag.label}
                      </Button>
                    );
                  })}
                  <span className="ml-auto flex items-center">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Move ${column.name} up`}
                      disabled={position === 0}
                      onClick={() => apply(moveColumn(table, column.id, -1))}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Move ${column.name} down`}
                      disabled={position === columns.length - 1}
                      onClick={() => apply(moveColumn(table, column.id, 1))}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={
                        relations > 0
                          ? `Remove ${column.name} and its ${relations === 1 ? "relation" : "relations"}`
                          : `Remove ${column.name}`
                      }
                      title={
                        relations > 0
                          ? `Also removes ${relations} ${relations === 1 ? "relation" : "relations"}`
                          : undefined
                      }
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        apply(removeColumn(table, column.id, edges))
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </span>
                </div>
                <details className="group/more">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
                    <ChevronRight
                      aria-hidden="true"
                      className="size-3 transition-transform group-open/more:rotate-90"
                    />
                    More
                    {summaryOf(column) ? (
                      <span className="min-w-0 truncate font-mono">
                        · {summaryOf(column)}
                      </span>
                    ) : null}
                  </summary>
                  <div className="pt-2">
                    <ColumnDetails
                      column={column}
                      onPatch={(next) => patch(column.id, next)}
                    />
                  </div>
                </details>
                {errors[column.id] ? (
                  <FieldError id={`${nameId}-error`}>
                    {errors[column.id]}
                  </FieldError>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => apply(addColumn(table))}
      >
        <Plus aria-hidden="true" />
        Add column
      </Button>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

const summaryOf = (column: TableNode["props"]["columns"][number]): string =>
  [
    column.length !== undefined ? `(${column.length})` : "",
    column.precision !== undefined
      ? `(${column.precision}${column.scale !== undefined ? `, ${column.scale}` : ""})`
      : "",
    column.generated?.kind === "identity" ? "counts up" : "",
    column.generated?.kind === "stored" ? "computed" : "",
    column.default?.kind === "now" ? "= now" : "",
    column.default?.kind === "uuid" ? "= uuid" : "",
    column.default?.kind === "literal" ? `= ${column.default.value}` : "",
    column.onUpdate === "now" ? "updates to now" : "",
    column.checks ? "checked" : "",
  ]
    .filter(Boolean)
    .join(" ");
