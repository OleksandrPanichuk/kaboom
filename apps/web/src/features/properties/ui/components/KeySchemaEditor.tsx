import { type DesignOp, KEY_ATTRIBUTE_TYPES } from "@repo/design";
import { Plus, Trash2 } from "lucide-react";
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
import {
  addKeyAttribute,
  type DynamoTableNode,
  readableRefusal,
  removeKeyAttribute,
  setTableKey,
  updateKeyAttribute,
} from "@/features/properties/utils";

import { DraftInput } from "./DraftInput";
import type { CommitResult } from "./PropFieldControl";

interface KeySchemaEditorProps {
  table: DynamoTableNode;
  onApply: (ops: DesignOp[]) => CommitResult;
}

const TYPE_LABELS = { S: "string", N: "number", B: "binary" } as const;

const NAME = /^[a-z_][a-z0-9_]*$/i;

const NONE = "__none__";

export function KeySchemaEditor({ table, onApply }: KeySchemaEditorProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const { attributes, partitionKey, sortKey } = table.props.keySchema;

  const apply = (op: DesignOp) => {
    const refused = onApply([op]);

    setError(refused === null ? null : readableRefusal(refused));
  };

  const choices = attributes.map((attribute) => ({
    value: attribute.id,
    label: attribute.name,
  }));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-5 text-muted-foreground">
        The attributes the table and its indexes are keyed by. Item types fill
        them in.
      </p>
      {attributes.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {attributes.map((attribute) => (
            <li
              key={attribute.id}
              className="flex min-w-0 items-center gap-1.5 rounded-xl border border-black/[0.07] bg-white p-1.5"
            >
              <div className="min-w-0 flex-1">
                <DraftInput
                  id={`${id}-${attribute.id}`}
                  value={attribute.name}
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

                    apply(updateKeyAttribute(table, attribute.id, { name }));
                  }}
                />
              </div>
              <Select
                value={attribute.type}
                items={KEY_ATTRIBUTE_TYPES.map((type) => ({
                  value: type,
                  label: TYPE_LABELS[type],
                }))}
                onValueChange={(type) => {
                  if (type)
                    apply(updateKeyAttribute(table, attribute.id, { type }));
                }}
              >
                <SelectTrigger
                  aria-label={`Type of ${attribute.name}`}
                  className="h-7 w-[6.5rem] text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KEY_ATTRIBUTE_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="text-xs">
                      {TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${attribute.name}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => apply(removeKeyAttribute(table, attribute.id))}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => apply(addKeyAttribute(table))}
      >
        <Plus aria-hidden="true" />
        Add key attribute
      </Button>

      {attributes.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          <Field>
            <FieldLabel htmlFor={`${id}-partition`} className="text-xs">
              Partition key
            </FieldLabel>
            <Select
              value={partitionKey}
              items={choices}
              onValueChange={(value) => {
                if (value) apply(setTableKey(table, "partition", value));
              }}
            >
              <SelectTrigger id={`${id}-partition`} className="w-full text-xs">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {choices.map((choice) => (
                  <SelectItem
                    key={choice.value}
                    value={choice.value}
                    className="font-mono text-xs"
                  >
                    {choice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-sort`} className="text-xs">
              Sort key
            </FieldLabel>
            <Select
              value={sortKey ?? NONE}
              items={[{ value: NONE, label: "None" }, ...choices]}
              onValueChange={(value) => {
                if (value)
                  apply(
                    setTableKey(table, "sort", value === NONE ? null : value),
                  );
              }}
            >
              <SelectTrigger id={`${id}-sort`} className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} className="text-xs">
                  None
                </SelectItem>
                {choices
                  .filter((choice) => choice.value !== partitionKey)
                  .map((choice) => (
                    <SelectItem
                      key={choice.value}
                      value={choice.value}
                      className="font-mono text-xs"
                    >
                      {choice.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
