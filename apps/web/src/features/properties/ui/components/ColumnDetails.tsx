import {
  type Column,
  type ColumnDefault,
  type ColumnGenerated,
  INTEGER_TYPES,
  NUMBER_TYPES,
  TEXT_TYPES,
  TIME_TYPES,
  TIMESTAMP_TYPES,
} from "@repo/design";
import { useId } from "react";

import { Field, FieldLabel } from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { type ColumnPatch, listOf } from "@/features/properties/utils";

import { DraftInput } from "./DraftInput";

interface ColumnDetailsProps {
  column: Column;
  onPatch: (patch: ColumnPatch) => void;
}

type DefaultChoice = "none" | ColumnDefault["kind"];
type GeneratedChoice = "none" | "identity" | "identity-always" | "stored";

const optionalNumber = (text: string): number | undefined => {
  const value = Number(text.trim());

  return text.trim() === "" || !Number.isFinite(value) ? undefined : value;
};

const generatedChoice = (
  generated: ColumnGenerated | undefined,
): GeneratedChoice =>
  generated === undefined
    ? "none"
    : generated.kind === "stored"
      ? "stored"
      : generated.always
        ? "identity-always"
        : "identity";

function SmallSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      <Select
        value={value}
        items={options.map((option) => ({ ...option }))}
        onValueChange={(next) => {
          if (next) onChange(next);
        }}
      >
        <SelectTrigger id={id} className="w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-xs"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function SmallInput({
  id,
  label,
  value,
  placeholder,
  numeric = false,
  onCommit,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  numeric?: boolean;
  onCommit: (text: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      <DraftInput
        id={id}
        value={value}
        inputMode={numeric ? "numeric" : "text"}
        placeholder={placeholder}
        invalid={false}
        onCommit={onCommit}
      />
    </Field>
  );
}

export function ColumnDetails({ column, onPatch }: ColumnDetailsProps) {
  const id = useId();
  const { type } = column;
  const defaults: Array<{ value: DefaultChoice; label: string }> = [
    { value: "none", label: "None" },
    { value: "literal", label: "A value" },
    ...(TIME_TYPES.has(type) ? [{ value: "now" as const, label: "Now" }] : []),
    ...(type === "uuid"
      ? [{ value: "uuid" as const, label: "A new uuid" }]
      : []),
    { value: "expression", label: "An expression" },
  ];
  const generated: Array<{ value: GeneratedChoice; label: string }> = [
    { value: "none", label: "None" },
    ...(INTEGER_TYPES.has(type)
      ? [
          { value: "identity" as const, label: "Counts up" },
          {
            value: "identity-always" as const,
            label: "Counts up, never set by hand",
          },
        ]
      : []),
    { value: "stored", label: "Computed from other columns" },
  ];
  const fallback = column.default;
  const computed = column.generated;

  return (
    <div className="grid gap-2.5 border-t border-black/[0.06] pt-2.5 sm:grid-cols-2">
      {type === "varchar" || type === "char" ? (
        <SmallInput
          id={`${id}-length`}
          label="Length"
          numeric
          placeholder="No limit"
          value={column.length?.toString() ?? ""}
          onCommit={(text) => onPatch({ length: optionalNumber(text) })}
        />
      ) : null}
      {type === "numeric" ? (
        <>
          <SmallInput
            id={`${id}-precision`}
            label="Precision"
            numeric
            placeholder="Any"
            value={column.precision?.toString() ?? ""}
            onCommit={(text) => onPatch({ precision: optionalNumber(text) })}
          />
          <SmallInput
            id={`${id}-scale`}
            label="Scale"
            numeric
            placeholder="0"
            value={column.scale?.toString() ?? ""}
            onCommit={(text) => onPatch({ scale: optionalNumber(text) })}
          />
        </>
      ) : null}
      {type === "enum" ? (
        <div className="sm:col-span-2">
          <SmallInput
            id={`${id}-values`}
            label="Values, separated by commas"
            value={(column.values ?? []).join(", ")}
            onCommit={(text) => {
              const values = listOf(text);

              onPatch({ values: values.length > 0 ? values : undefined });
            }}
          />
        </div>
      ) : null}

      <SmallSelect
        id={`${id}-default`}
        label="Default"
        value={fallback?.kind ?? "none"}
        options={defaults}
        onChange={(choice) =>
          onPatch({
            default:
              choice === "none"
                ? undefined
                : choice === "literal"
                  ? { kind: "literal", value: "" }
                  : choice === "expression"
                    ? { kind: "expression", sql: "1" }
                    : { kind: choice },
            ...(choice !== "none" ? { generated: undefined } : {}),
          })
        }
      />
      {fallback?.kind === "literal" || fallback?.kind === "expression" ? (
        <SmallInput
          id={`${id}-default-value`}
          label={
            fallback.kind === "literal" ? "Default value" : "Default expression"
          }
          value={fallback.kind === "literal" ? fallback.value : fallback.sql}
          onCommit={(text) =>
            onPatch({
              default:
                fallback.kind === "literal"
                  ? { kind: "literal", value: text.trim() }
                  : { kind: "expression", sql: text.trim() || "1" },
            })
          }
        />
      ) : (
        <span className="max-sm:hidden" />
      )}

      <SmallSelect
        id={`${id}-generated`}
        label="Generated"
        value={generatedChoice(computed)}
        options={generated}
        onChange={(choice) =>
          onPatch({
            generated:
              choice === "none"
                ? undefined
                : choice === "stored"
                  ? {
                      kind: "stored",
                      sql: computed?.kind === "stored" ? computed.sql : "1",
                    }
                  : { kind: "identity", always: choice === "identity-always" },
            ...(choice !== "none" ? { default: undefined } : {}),
            ...(choice === "identity" || choice === "identity-always"
              ? { nullable: false }
              : {}),
          })
        }
      />
      {computed?.kind === "stored" ? (
        <SmallInput
          id={`${id}-generated-sql`}
          label="Computed as"
          value={computed.sql}
          onCommit={(text) =>
            onPatch({ generated: { kind: "stored", sql: text.trim() || "1" } })
          }
        />
      ) : (
        <span className="max-sm:hidden" />
      )}

      {TIMESTAMP_TYPES.has(type) ? (
        <Field
          orientation="horizontal"
          className="items-center justify-between sm:col-span-2"
        >
          <FieldLabel htmlFor={`${id}-on-update`} className="text-xs">
            Set to now whenever the row changes
          </FieldLabel>
          <Switch
            id={`${id}-on-update`}
            checked={column.onUpdate === "now"}
            onCheckedChange={(checked) =>
              onPatch({ onUpdate: checked ? "now" : undefined })
            }
          />
        </Field>
      ) : null}

      {NUMBER_TYPES.has(type) ? (
        <>
          <SmallInput
            id={`${id}-min`}
            label="At least"
            numeric
            value={column.checks?.min?.toString() ?? ""}
            onCommit={(text) =>
              onPatch({
                checks: tidy({ ...column.checks, min: optionalNumber(text) }),
              })
            }
          />
          <SmallInput
            id={`${id}-max`}
            label="At most"
            numeric
            value={column.checks?.max?.toString() ?? ""}
            onCommit={(text) =>
              onPatch({
                checks: tidy({ ...column.checks, max: optionalNumber(text) }),
              })
            }
          />
        </>
      ) : null}
      {TEXT_TYPES.has(type) ? (
        <>
          <SmallInput
            id={`${id}-min-length`}
            label="Shortest length"
            numeric
            value={column.checks?.minLength?.toString() ?? ""}
            onCommit={(text) =>
              onPatch({
                checks: tidy({
                  ...column.checks,
                  minLength: optionalNumber(text),
                }),
              })
            }
          />
          <SmallInput
            id={`${id}-allowed`}
            label="Only these values"
            placeholder="Any"
            value={(column.checks?.in ?? []).join(", ")}
            onCommit={(text) => {
              const values = listOf(text);

              onPatch({
                checks: tidy({
                  ...column.checks,
                  in: values.length > 0 ? values : undefined,
                }),
              });
            }}
          />
        </>
      ) : null}
    </div>
  );
}

const tidy = (checks: NonNullable<Column["checks"]>): Column["checks"] => {
  const kept = Object.fromEntries(
    Object.entries(checks).filter(([, value]) => value !== undefined),
  );

  return Object.keys(kept).length > 0 ? kept : undefined;
};
