import { propControl, type PropField } from "@repo/design";
import { useId, useState } from "react";

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
import { UNIT_SUFFIXES } from "@/features/properties/constants";
import {
  checkNumber,
  fromDisplay,
  optionLabel,
  toDisplay,
} from "@/features/properties/utils";

import { DraftInput } from "./DraftInput";

export type CommitResult = string | null;

interface PropFieldControlProps {
  field: PropField;
  value: unknown;
  onCommit: (value: unknown) => CommitResult;
}

export function PropFieldControl({
  field,
  value,
  onCommit,
}: PropFieldControlProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const control = propControl(field.schema);
  const { meta } = field;
  const descriptionId = `${id}-description`;

  const commit = (next: unknown) => setError(onCommit(next));

  if (control.type === "custom") return null;

  if (control.type === "group") {
    const group = (value ?? {}) as Record<string, unknown>;

    return (
      <fieldset className="flex flex-col gap-3 rounded-xl border border-black/[0.07] p-3">
        <legend className="px-1 text-sm font-medium">{meta.title}</legend>
        {meta.description ? (
          <p className="-mt-1 text-xs leading-5 text-muted-foreground">
            {meta.description}
          </p>
        ) : null}
        {control.fields.map((child) => (
          <PropFieldControl
            key={child.key}
            field={child}
            value={group[child.key]}
            onCommit={(next) => onCommit({ ...group, [child.key]: next })}
          />
        ))}
      </fieldset>
    );
  }

  if (control.type === "boolean") {
    return (
      <Field
        orientation="horizontal"
        className="items-start justify-between gap-3"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <FieldLabel htmlFor={id}>{meta.title}</FieldLabel>
          {meta.description ? (
            <FieldDescription id={descriptionId} className="text-xs">
              {meta.description}
            </FieldDescription>
          ) : null}
          {error ? <FieldError>{error}</FieldError> : null}
        </div>
        <Switch
          id={id}
          checked={value === true}
          aria-describedby={meta.description ? descriptionId : undefined}
          onCheckedChange={(checked) => commit(checked)}
        />
      </Field>
    );
  }

  const unit = meta.unit;
  const suffix = unit ? UNIT_SUFFIXES[unit] : null;

  return (
    <Field data-invalid={error && control.type !== "choice" ? true : undefined}>
      <FieldLabel htmlFor={id}>{meta.title}</FieldLabel>
      {control.type === "choice" ? (
        <Select
          value={String(value)}
          onValueChange={(next) => commit(next)}
          items={control.options.map((option) => ({
            value: option,
            label: optionLabel(option),
          }))}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {control.options.map((option) => (
              <SelectItem key={option} value={option}>
                {optionLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : control.type === "number" ? (
        <div className="relative">
          <DraftInput
            id={id}
            value={toDisplay(Number(value), unit)}
            inputMode={control.integer ? "numeric" : "decimal"}
            invalid={error !== null}
            describedBy={meta.description ? descriptionId : undefined}
            onUnchanged={() => setError(null)}
            onCommit={(text) => {
              const number = fromDisplay(text, unit);
              const problem = checkNumber(number, control, unit);

              if (problem) setError(problem);
              else commit(number);
            }}
          />
          {suffix ? (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </div>
      ) : (
        <DraftInput
          id={id}
          value={String(value ?? "")}
          maxLength={control.maxLength ?? undefined}
          invalid={error !== null}
          describedBy={meta.description ? descriptionId : undefined}
          onUnchanged={() => setError(null)}
          onCommit={(text) => commit(text.trim())}
        />
      )}
      {meta.description ? (
        <FieldDescription id={descriptionId} className="text-xs">
          {meta.description}
        </FieldDescription>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
