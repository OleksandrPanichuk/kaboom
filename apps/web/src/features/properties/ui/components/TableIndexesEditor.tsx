import type { DesignOp } from "@repo/design";
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
  removeIndex,
  type TableNode,
} from "@/features/properties/utils";

import type { CommitResult } from "./PropFieldControl";

interface TableIndexesEditorProps {
  table: TableNode;
  onApply: (ops: DesignOp[]) => CommitResult;
}

export function TableIndexesEditor({
  table,
  onApply,
}: TableIndexesEditorProps) {
  const id = useId();
  const [draft, setDraft] = useState<string[]>([]);
  const [unique, setUnique] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { columns, indexes } = table.props;
  const nameOf = (columnId: string) =>
    columns.find((column) => column.id === columnId)?.name ?? columnId;
  const remaining = columns.filter((column) => !draft.includes(column.id));

  const add = () => {
    const problem = indexProblem(table, draft);

    if (problem) {
      setError(problem);
      return;
    }

    const refused = onApply([addIndex(table, draft, unique)]);

    setError(refused);

    if (!refused) {
      setDraft([]);
      setUnique(false);
    }
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
              className="flex min-w-0 items-center gap-2 rounded-lg border border-black/[0.07] bg-white py-1 pr-1 pl-2.5"
            >
              <span className="min-w-0 truncate font-mono text-xs">
                ({index.columns.map(nameOf).join(", ")})
              </span>
              {index.unique ? (
                <span className="shrink-0 rounded bg-zinc-100 px-1 text-[10px] font-medium text-zinc-600">
                  unique
                </span>
              ) : null}
              <Button
                variant="ghost"
                size="icon-xs"
                className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove the index on ${index.columns.map(nameOf).join(", ")}`}
                onClick={() =>
                  setError(onApply([removeIndex(table, index.id)]))
                }
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {columns.length > 0 ? (
        <div className="flex flex-col gap-2.5 rounded-xl border border-dashed border-black/10 p-2.5">
          <p className="text-xs font-medium">New index</p>
          {draft.length > 0 ? (
            <ol className="flex flex-wrap gap-1">
              {draft.map((columnId, position) => (
                <li
                  key={columnId}
                  className="flex items-center gap-1 rounded-md bg-violet-50 py-0.5 pr-0.5 pl-1.5 font-mono text-xs text-violet-800"
                >
                  <span className="text-violet-500">{position + 1}.</span>
                  {nameOf(columnId)}
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
