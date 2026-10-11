import {
  type DesignEdge,
  type DesignOp,
  type EdgePatch,
  ON_DELETE_ACTIONS,
  type OnDeleteAction,
} from "@repo/design";
import { Plus, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import {
  readableRefusal,
  type RelationColumns,
  withPairs,
} from "@/features/properties/utils";

import { InspectorSection } from "./InspectorSection";
import type { CommitResult } from "./PropFieldControl";

const RULE_LABELS: Readonly<Record<OnDeleteAction, string>> = {
  restrict: "Refuse it",
  cascade: "Follow it",
  "set-null": "Set the column to null",
};

const NO_RULE = "none";

interface RelationSectionProps {
  edge: DesignEdge;
  columns: RelationColumns;
  fromLabel: string;
  toLabel: string;
  onPatch: (patch: EdgePatch) => CommitResult;
  onApply: (ops: DesignOp[]) => CommitResult;
}

export function RelationSection({
  edge,
  columns,
  fromLabel,
  toLabel,
  onPatch,
  onApply,
}: RelationSectionProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pairFrom, setPairFrom] = useState<string | null>(null);
  const relation = edge.relation!;
  const pairs = columns.pairs.map((pair) => ({
    fromColumn: pair.fromId,
    toColumn: pair.toId,
  }));
  const report = (refused: CommitResult) =>
    setError(refused === null ? null : readableRefusal(refused));

  const ruleSelect = (
    key: "onDelete" | "onUpdate",
    label: string,
    optional: boolean,
  ) => {
    const value = relation[key] ?? NO_RULE;
    const options = [
      ...(optional ? [{ value: NO_RULE, label: "No rule (refuse it)" }] : []),
      ...ON_DELETE_ACTIONS.map((action) => ({
        value: action,
        label: RULE_LABELS[action],
      })),
    ];

    return (
      <Field>
        <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
        <Select
          value={value}
          items={options}
          onValueChange={(next) => {
            if (!next) return;

            report(
              onPatch({
                relation: {
                  [key]: next === NO_RULE ? null : (next as OnDeleteAction),
                },
              }),
            );
          }}
        >
          <SelectTrigger id={`${id}-${key}`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  };

  return (
    <InspectorSection title="Foreign key">
      <ul className="flex flex-col gap-1">
        {columns.pairs.map((pair, position) => (
          <li
            key={`${pair.fromId}-${pair.toId}`}
            className="flex min-w-0 items-center gap-1 font-mono text-sm"
          >
            <span className="min-w-0 break-all">
              {fromLabel}.{pair.from} → {toLabel}.{pair.to}
            </span>
            {position > 0 ? (
              <Button
                variant="ghost"
                size="icon-xs"
                className="ml-auto shrink-0 text-muted-foreground"
                aria-label={`Drop ${pair.from} from the key`}
                onClick={() =>
                  report(
                    onApply(
                      withPairs(
                        edge,
                        pairs.filter((_, index) => index !== position),
                      ),
                    ),
                  )
                }
              >
                <X aria-hidden="true" />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="-mt-2 text-xs leading-5 text-muted-foreground text-pretty">
        {columns.oneToOne
          ? `One to one: ${columns.from} is unique, so each ${toLabel} row has at most one ${fromLabel} row.`
          : `Many to one: each ${toLabel} row may have many ${fromLabel} rows. Make ${columns.from} unique for one to one.`}
        {columns.optional
          ? ` The key may be empty, so a ${fromLabel} row may reference nothing.`
          : ""}
      </p>
      {columns.spareFrom.length > 0 && columns.spareTo.length > 0 ? (
        <Field>
          <FieldLabel className="text-xs">
            Add a column pair, for a composite key
          </FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={pairFrom}
              items={columns.spareFrom.map((column) => ({
                value: column.id,
                label: column.name,
              }))}
              onValueChange={(next) => setPairFrom(next)}
            >
              <SelectTrigger
                aria-label={`A column of ${fromLabel}`}
                className="w-full text-xs"
              >
                <SelectValue placeholder={`${fromLabel} column`} />
              </SelectTrigger>
              <SelectContent>
                {columns.spareFrom.map((column) => (
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
            <Select
              value={null}
              items={columns.spareTo.map((column) => ({
                value: column.id,
                label: column.name,
              }))}
              onValueChange={(next) => {
                if (!next || !pairFrom) return;

                report(
                  onApply(
                    withPairs(edge, [
                      ...pairs,
                      { fromColumn: pairFrom, toColumn: next },
                    ]),
                  ),
                );
                setPairFrom(null);
              }}
            >
              <SelectTrigger
                aria-label={`The column of ${toLabel} it references`}
                className="w-full text-xs"
                disabled={!pairFrom}
              >
                <SelectValue placeholder={`${toLabel} column`} />
              </SelectTrigger>
              <SelectContent>
                {columns.spareTo.map((column) => (
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
          </div>
          <FieldDescription className="flex items-center gap-1 text-xs">
            <Plus aria-hidden="true" className="size-3" />
            The columns it references must be exactly a key of {toLabel}.
          </FieldDescription>
        </Field>
      ) : null}
      {ruleSelect("onDelete", `When a ${toLabel} row is deleted`, false)}
      {ruleSelect("onUpdate", `When a ${toLabel} key changes`, true)}
      <Field orientation="horizontal" className="items-center justify-between">
        <FieldLabel htmlFor={`${id}-deferrable`} className="text-xs">
          Check it when the transaction commits
        </FieldLabel>
        <Switch
          id={`${id}-deferrable`}
          checked={relation.deferrable === true}
          onCheckedChange={(checked) =>
            report(onPatch({ relation: { deferrable: checked ? true : null } }))
          }
        />
      </Field>
      {error ? <FieldError>{error}</FieldError> : null}
    </InspectorSection>
  );
}
