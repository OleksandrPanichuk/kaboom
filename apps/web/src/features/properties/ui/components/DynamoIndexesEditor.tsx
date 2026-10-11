import {
  type DesignOp,
  DYNAMO_INDEX_KINDS,
  DYNAMO_PROJECTIONS,
  type DynamoIndexKind,
  type DynamoProjection,
} from "@repo/design";
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
  addDynamoIndex,
  type DynamoTableNode,
  readableRefusal,
  removeDynamoIndex,
} from "@/features/properties/utils";

import { DraftInput } from "./DraftInput";
import type { CommitResult } from "./PropFieldControl";

interface DynamoIndexesEditorProps {
  table: DynamoTableNode;
  onApply: (ops: DesignOp[]) => CommitResult;
}

const KIND_LABELS: Readonly<Record<DynamoIndexKind, string>> = {
  global: "global",
  local: "local",
};

const PROJECTION_LABELS: Readonly<Record<DynamoProjection, string>> = {
  all: "all attributes",
  "keys-only": "keys only",
  include: "keys and…",
};

const NONE = "__none__";

export function DynamoIndexesEditor({
  table,
  onApply,
}: DynamoIndexesEditorProps) {
  const id = useId();
  const { keySchema, indexes } = table.props;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DynamoIndexKind>("global");
  const [partition, setPartition] = useState<string | null>(null);
  const [sort, setSort] = useState<string | null>(null);
  const [projection, setProjection] = useState<DynamoProjection>("all");
  const [include, setInclude] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nameOf = (key: string | null) =>
    keySchema.attributes.find((attribute) => attribute.id === key)?.name ??
    key ??
    "";
  const choices = keySchema.attributes.map((attribute) => ({
    value: attribute.id,
    label: attribute.name,
  }));
  const partitionKey = kind === "local" ? keySchema.partitionKey : partition;

  const add = () => {
    if (partitionKey === null) {
      setError("Choose the index's partition key.");
      return;
    }

    const names = include
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const refused = onApply([
      addDynamoIndex(table, {
        name: name.trim() || `GSI${indexes.length + 1}`,
        kind,
        partitionKey,
        sortKey: sort,
        projection,
        ...(projection === "include" ? { include: names } : {}),
      }),
    ]);

    setError(refused === null ? null : readableRefusal(refused));

    if (!refused) {
      setName("");
      setSort(null);
      setInclude("");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {indexes.length === 0 ? (
        <p className="text-sm leading-5 text-muted-foreground">
          Only the table's own key is queryable.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {indexes.map((index) => (
            <li
              key={index.id}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-black/[0.07] bg-white py-1 pr-1 pl-2.5"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-xs">
                  {index.name} ·{" "}
                  {[index.partitionKey, index.sortKey]
                    .filter((key) => key !== null)
                    .map(nameOf)
                    .join(", ")}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {KIND_LABELS[index.kind]} ·{" "}
                  {index.projection === "include"
                    ? `keys and ${(index.include ?? []).join(", ")}`
                    : PROJECTION_LABELS[index.projection]}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove the index ${index.name}`}
                onClick={() => {
                  const refused = onApply([removeDynamoIndex(table, index.id)]);

                  setError(refused === null ? null : readableRefusal(refused));
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2.5 rounded-xl border border-dashed border-black/10 p-2.5">
        <p className="text-xs font-medium">New index</p>
        <div className="grid grid-cols-2 gap-2">
          <Field>
            <FieldLabel htmlFor={`${id}-name`} className="text-xs">
              Name
            </FieldLabel>
            <DraftInput
              id={`${id}-name`}
              value={name}
              maxLength={255}
              placeholder={`GSI${indexes.length + 1}`}
              invalid={false}
              onCommit={(text) => setName(text.trim())}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-kind`} className="text-xs">
              Kind
            </FieldLabel>
            <Select
              value={kind}
              items={DYNAMO_INDEX_KINDS.map((value) => ({
                value,
                label: KIND_LABELS[value],
              }))}
              onValueChange={(value) => {
                if (value) setKind(value);
              }}
            >
              <SelectTrigger id={`${id}-kind`} className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DYNAMO_INDEX_KINDS.map((value) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {KIND_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-partition`} className="text-xs">
              Partition key
            </FieldLabel>
            <Select
              value={partitionKey}
              disabled={kind === "local"}
              items={choices}
              onValueChange={(value) => {
                if (value) setPartition(value);
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
              value={sort ?? NONE}
              items={[{ value: NONE, label: "None" }, ...choices]}
              onValueChange={(value) => {
                if (value) setSort(value === NONE ? null : value);
              }}
            >
              <SelectTrigger id={`${id}-sort`} className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} className="text-xs">
                  None
                </SelectItem>
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
        </div>
        <Field>
          <FieldLabel htmlFor={`${id}-projection`} className="text-xs">
            Projects
          </FieldLabel>
          <Select
            value={projection}
            items={DYNAMO_PROJECTIONS.map((value) => ({
              value,
              label: PROJECTION_LABELS[value],
            }))}
            onValueChange={(value) => {
              if (value) setProjection(value);
            }}
          >
            <SelectTrigger id={`${id}-projection`} className="w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DYNAMO_PROJECTIONS.map((value) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {PROJECTION_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {projection === "include" ? (
          <Field>
            <FieldLabel htmlFor={`${id}-include`} className="text-xs">
              Attributes to include, separated by commas
            </FieldLabel>
            <DraftInput
              id={`${id}-include`}
              value={include}
              placeholder="status, total"
              invalid={false}
              onCommit={(text) => setInclude(text)}
            />
          </Field>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          disabled={choices.length === 0}
          onClick={add}
        >
          <Plus aria-hidden="true" />
          Add index
        </Button>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
