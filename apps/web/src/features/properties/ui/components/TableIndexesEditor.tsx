import {
  type DesignOp,
  type Engine,
  engineIndexMethods,
  FILTER_OPERATORS,
  type FilterOperator,
  type IndexFilter,
  type IndexMethod,
  isSqlEngine,
  type TableIndex,
  TEXT_TYPES,
} from "@repo/design";
import { cn } from "cn";
import { Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import {
  addIndex,
  indexProblem,
  readableRefusal,
  removeIndex,
  type TableNode,
} from "@/features/properties/utils";

import { DraftInput } from "./DraftInput";
import type { CommitResult } from "./PropFieldControl";

interface TableIndexesEditorProps {
  table: TableNode;
  engine: Engine;
  onApply: (ops: DesignOp[]) => CommitResult;
}

const METHOD_LABELS: Readonly<Record<IndexMethod, string>> = {
  btree: "B-tree",
  hash: "Hash",
  gin: "GIN",
  gist: "GiST",
  brin: "BRIN",
  fulltext: "Full text",
};

const OPERATOR_LABELS: Readonly<Record<FilterOperator, string>> = {
  "=": "is",
  "!=": "is not",
  "is-null": "is empty",
  "is-not-null": "is set",
};

const NO_FILTER = "none";

export function TableIndexesEditor({
  table,
  engine,
  onApply,
}: TableIndexesEditorProps) {
  const id = useId();
  const [draft, setDraft] = useState<string[]>([]);
  const [lowered, setLowered] = useState<string[]>([]);
  const [included, setIncluded] = useState<string[]>([]);
  const [unique, setUnique] = useState(false);
  const [method, setMethod] = useState<IndexMethod>("btree");
  const [filter, setFilter] = useState<IndexFilter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { columns, indexes } = table.props;
  const methods = isSqlEngine(engine)
    ? engineIndexMethods(engine)
    : ["btree" as const];
  const nameOf = (columnId: string) =>
    columns.find((column) => column.id === columnId)?.name ?? columnId;
  const isText = (columnId: string) => {
    const column = columns.find((item) => item.id === columnId);

    return column !== undefined && TEXT_TYPES.has(column.type);
  };
  const remaining = columns.filter((column) => !draft.includes(column.id));
  const includable =
    engine === "postgres" && method === "btree"
      ? columns.filter(
          (column) =>
            !draft.includes(column.id) && !included.includes(column.id),
        )
      : [];

  const reset = () => {
    setDraft([]);
    setLowered([]);
    setIncluded([]);
    setUnique(false);
    setMethod("btree");
    setFilter(null);
  };

  const describe = (index: TableIndex) =>
    `(${index.columns
      .map((columnId) => {
        const name = nameOf(columnId);
        const shown = index.lower?.includes(columnId) ? `lower(${name})` : name;

        return index.descending?.includes(columnId) ? `${shown} desc` : shown;
      })
      .join(", ")})`;

  const add = () => {
    const problem = indexProblem(table, draft);

    if (problem) {
      setError(problem);
      return;
    }

    const refused = onApply([
      addIndex(table, {
        columns: draft,
        unique,
        method,
        lower: lowered.filter((columnId) => draft.includes(columnId)),
        include: included,
        ...(filter ? { where: filter } : {}),
      }),
    ]);

    setError(refused === null ? null : readableRefusal(refused));

    if (!refused) reset();
  };

  return (
    <div className="flex flex-col gap-3">
      {indexes.length === 0 ? (
        <p className="text-sm leading-5 text-muted-foreground">
          Only the primary key and unique columns are indexed.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {indexes.map((index) => (
            <li
              key={index.id}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card py-1 pr-1 pl-2.5"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-xs">
                  {describe(index)}
                </span>
                {index.method || index.include || index.where ? (
                  <span className="truncate text-[11px] text-muted-foreground">
                    {[
                      index.method ? METHOD_LABELS[index.method] : null,
                      index.include
                        ? `includes ${index.include.map(nameOf).join(", ")}`
                        : null,
                      index.where
                        ? `where ${nameOf(index.where.column)} ${OPERATOR_LABELS[index.where.op]}${index.where.value ? ` ${index.where.value}` : ""}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : null}
              </span>
              {index.unique ? (
                <span className="shrink-0 rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                  unique
                </span>
              ) : null}
              <Button
                variant="ghost"
                size="icon-xs"
                className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove the index on ${index.columns.map(nameOf).join(", ")}`}
                onClick={() => {
                  const refused = onApply([removeIndex(table, index.id)]);

                  setError(refused === null ? null : readableRefusal(refused));
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {columns.length > 0 ? (
        <div className="flex flex-col gap-2.5 rounded-xl border border-dashed border-border p-2.5">
          <p className="text-xs font-medium">New index</p>
          {methods.length > 1 ? (
            <Field>
              <FieldLabel htmlFor={`${id}-method`} className="text-xs">
                Kind
              </FieldLabel>
              <Select
                value={method}
                items={methods.map((value) => ({
                  value,
                  label: METHOD_LABELS[value],
                }))}
                onValueChange={(next) => {
                  if (next) setMethod(next);
                }}
              >
                <SelectTrigger id={`${id}-method`} className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methods.map((value) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {METHOD_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          {draft.length > 0 ? (
            <ol className="flex flex-wrap gap-1">
              {draft.map((columnId, position) => (
                <li
                  key={columnId}
                  className="flex items-center gap-1 rounded-md bg-violet-50 py-0.5 pr-0.5 pl-1.5 font-mono text-xs text-violet-800"
                >
                  <span className="text-violet-500">{position + 1}.</span>
                  {lowered.includes(columnId)
                    ? `lower(${nameOf(columnId)})`
                    : nameOf(columnId)}
                  {isText(columnId) && method === "btree" ? (
                    <button
                      type="button"
                      aria-pressed={lowered.includes(columnId)}
                      aria-label={`Ignore the case of ${nameOf(columnId)}`}
                      title="Ignore case: index lower(column)"
                      className={cn(
                        "grid h-4 place-items-center rounded px-1 text-[10px] hover:bg-violet-100",
                        lowered.includes(columnId) && "bg-violet-200",
                      )}
                      onClick={() =>
                        setLowered((current) =>
                          current.includes(columnId)
                            ? current.filter((item) => item !== columnId)
                            : [...current, columnId],
                        )
                      }
                    >
                      aA
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Leave ${nameOf(columnId)} out`}
                    className="grid size-4 place-items-center rounded hover:bg-violet-100"
                    onClick={() =>
                      setDraft((current) =>
                        current.filter((item) => item !== columnId),
                      )
                    }
                  >
                    <X aria-hidden="true" className="size-3" />
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
          {remaining.length > 0 ? (
            <Select
              value={null}
              items={remaining.map((column) => ({
                value: column.id,
                label: column.name,
              }))}
              onValueChange={(columnId) => {
                if (columnId) setDraft((current) => [...current, columnId]);
                setError(null);
              }}
            >
              <SelectTrigger
                aria-label={
                  draft.length === 0 ? "First column" : "Then by column"
                }
                className="w-full text-xs"
              >
                <SelectValue
                  placeholder={
                    draft.length === 0 ? "Lead with a column" : "Then by…"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {remaining.map((column) => (
                  <SelectItem
                    key={column.id}
                    value={column.id}
                    className="font-mono text-xs"
                  >
                    {column.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {includable.length > 0 || included.length > 0 ? (
            <Field>
              <FieldLabel className="text-xs">
                Also carry, to answer without the table
              </FieldLabel>
              {included.length > 0 ? (
                <p className="font-mono text-xs">
                  {included.map(nameOf).join(", ")}
                </p>
              ) : null}
              {includable.length > 0 ? (
                <Select
                  value={null}
                  items={includable.map((column) => ({
                    value: column.id,
                    label: column.name,
                  }))}
                  onValueChange={(columnId) => {
                    if (columnId)
                      setIncluded((current) => [...current, columnId]);
                  }}
                >
                  <SelectTrigger
                    aria-label="Include a column"
                    className="w-full text-xs"
                  >
                    <SelectValue placeholder="Include a column" />
                  </SelectTrigger>
                  <SelectContent>
                    {includable.map((column) => (
                      <SelectItem
                        key={column.id}
                        value={column.id}
                        className="font-mono text-xs"
                      >
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </Field>
          ) : null}
          {engine !== "mysql" ? (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Field>
                <FieldLabel htmlFor={`${id}-filter`} className="text-xs">
                  Only rows where
                </FieldLabel>
                <Select
                  value={filter?.column ?? NO_FILTER}
                  items={[
                    { value: NO_FILTER, label: "Every row" },
                    ...columns.map((column) => ({
                      value: column.id,
                      label: column.name,
                    })),
                  ]}
                  onValueChange={(next) =>
                    setFilter(
                      !next || next === NO_FILTER
                        ? null
                        : { column: next, op: filter?.op ?? "is-not-null" },
                    )
                  }
                >
                  <SelectTrigger id={`${id}-filter`} className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FILTER} className="text-xs">
                      Every row
                    </SelectItem>
                    {columns.map((column) => (
                      <SelectItem
                        key={column.id}
                        value={column.id}
                        className="font-mono text-xs"
                      >
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {filter ? (
                <Field>
                  <FieldLabel htmlFor={`${id}-op`} className="text-xs">
                    Condition
                  </FieldLabel>
                  <Select
                    value={filter.op}
                    items={FILTER_OPERATORS.map((op) => ({
                      value: op,
                      label: OPERATOR_LABELS[op],
                    }))}
                    onValueChange={(op) => {
                      if (op) {
                        setFilter({
                          column: filter.column,
                          op,
                          ...(op === "=" || op === "!="
                            ? { value: filter.value ?? "value" }
                            : {}),
                        });
                      }
                    }}
                  >
                    <SelectTrigger id={`${id}-op`} className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_OPERATORS.map((op) => (
                        <SelectItem key={op} value={op} className="text-xs">
                          {OPERATOR_LABELS[op]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              {filter && (filter.op === "=" || filter.op === "!=") ? (
                <div className="sm:col-span-2">
                  <DraftInput
                    id={`${id}-value`}
                    value={filter.value ?? ""}
                    placeholder="Value"
                    invalid={false}
                    onCommit={(text) =>
                      setFilter({ ...filter, value: text.trim() || "value" })
                    }
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          <Field
            orientation="horizontal"
            className="items-center justify-between"
          >
            <FieldLabel htmlFor={`${id}-unique`} className="text-xs">
              Unique
            </FieldLabel>
            <Switch
              id={`${id}-unique`}
              checked={unique}
              onCheckedChange={setUnique}
            />
          </Field>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            disabled={draft.length === 0}
            onClick={add}
          >
            <Plus aria-hidden="true" />
            Add index
          </Button>
        </div>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
