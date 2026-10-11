import {
  type DesignEdge,
  type DesignOp,
  type DocumentField,
  FIELD_TYPES,
  SCALAR_FIELD_TYPES,
} from "@repo/design";
import { cn } from "cn";
import { CornerDownRight, Plus, Trash2 } from "lucide-react";
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
  addField,
  type CollectionNode,
  readableRefusal,
  removeField,
  updateField,
} from "@/features/properties/utils";

import { DraftInput } from "./DraftInput";
import type { CommitResult } from "./PropFieldControl";

interface FieldsEditorProps {
  collection: CollectionNode;
  edges: readonly DesignEdge[];
  onApply: (ops: DesignOp[]) => CommitResult;
}

const ITEM_TYPES = [...SCALAR_FIELD_TYPES, "object"] as const;

const NAME = /^[a-z_][a-z0-9_]*$/i;

export function FieldsEditor({
  collection,
  edges,
  onApply,
}: FieldsEditorProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  const apply = (ops: DesignOp[] | DesignOp) => {
    const refused = onApply(Array.isArray(ops) ? ops : [ops]);

    setError(refused === null ? null : readableRefusal(refused));
  };

  const rows = (
    fields: readonly DocumentField[],
    parent: string[],
    depth: number,
  ) =>
    fields.map((field) => {
      const path = [...parent, field.id];
      const nested =
        field.type === "object" ||
        (field.type === "array" && field.of === "object");

      return (
        <li key={field.id} className="flex flex-col gap-1.5">
          <div
            className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-card p-2"
            style={{ marginLeft: depth * 12 }}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              {depth > 0 ? (
                <CornerDownRight
                  aria-hidden="true"
                  className="size-3 shrink-0 text-muted-foreground"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <DraftInput
                  id={`${id}-${path.join("-")}`}
                  value={field.name}
                  maxLength={63}
                  invalid={false}
                  onCommit={(text) => {
                    const name = text.trim();

                    if (!NAME.test(name)) {
                      setError(
                        "Use letters, digits and underscores, starting with a letter.",
                      );
                      return;
                    }

                    apply(updateField(collection, path, { name }));
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${field.name}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => apply(removeField(collection, path, edges))}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Select
                value={field.type}
                items={FIELD_TYPES.map((type) => ({
                  value: type,
                  label: type,
                }))}
                onValueChange={(type) => {
                  if (type) apply(updateField(collection, path, { type }));
                }}
              >
                <SelectTrigger
                  aria-label={`Type of ${field.name}`}
                  className="h-7 w-[6.5rem] font-mono text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
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
              {field.type === "array" ? (
                <Select
                  value={field.of ?? "string"}
                  items={ITEM_TYPES.map((type) => ({
                    value: type,
                    label: `of ${type}`,
                  }))}
                  onValueChange={(of) => {
                    if (of) apply(updateField(collection, path, { of }));
                  }}
                >
                  <SelectTrigger
                    aria-label={`What ${field.name} holds`}
                    className="h-7 w-[7.5rem] font-mono text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="font-mono text-xs"
                      >
                        of {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                variant="outline"
                size="xs"
                aria-pressed={field.required}
                className={cn(
                  field.required &&
                    "border-success-border bg-success-surface text-success-foreground hover:bg-success-surface",
                )}
                onClick={() =>
                  apply(
                    updateField(collection, path, {
                      required: !field.required,
                    }),
                  )
                }
              >
                Required
              </Button>
              {nested ? (
                <Button
                  variant="ghost"
                  size="xs"
                  className="ml-auto"
                  onClick={() => apply(addField(collection, path))}
                >
                  <Plus aria-hidden="true" />
                  Field inside
                </Button>
              ) : null}
            </div>
          </div>
          {field.fields && field.fields.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {rows(field.fields, path, depth + 1)}
            </ul>
          ) : null}
        </li>
      );
    });

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs text-muted-foreground">
        _id · objectId, always there
      </p>
      {collection.props.fields.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {rows(collection.props.fields, [], 0)}
        </ul>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => apply(addField(collection, null))}
      >
        <Plus aria-hidden="true" />
        Add field
      </Button>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
