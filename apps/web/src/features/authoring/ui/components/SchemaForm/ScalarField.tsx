import { useId } from "react";

import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { type FieldShape, humanize } from "@/features/authoring/utils";

import { FieldFrame } from "./FieldFrame";
import { useSchemaForm } from "./SchemaForm.context";

interface ScalarFieldProps {
  shape: Extract<
    FieldShape,
    { kind: "string" | "number" | "enum" | "boolean" | "const" }
  >;
  label: string;
  description: string | null;
  path: ReadonlyArray<string | number>;
  value: unknown;
  fallback?: unknown;
  optional: boolean;
  onChange: (value: unknown) => void;
}

const UNSET = "__unset__";

interface Choice {
  value: string;
  label: string;
}

function ChoiceSelect({
  id,
  value,
  choices,
  onChange,
}: {
  id: string;
  value: string;
  choices: Choice[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value}
      items={choices}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {choices.map((choice) => (
          <SelectItem key={choice.value} value={choice.value}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ScalarField({
  shape,
  label,
  description,
  path,
  value,
  fallback,
  optional,
  onChange,
}: ScalarFieldProps) {
  const shown = value === undefined ? fallback : value;
  const id = useId();
  const { refs } = useSchemaForm();
  const frame = (control: React.ReactNode) => (
    <FieldFrame id={id} label={label} description={description} path={path}>
      {control}
    </FieldFrame>
  );

  if (shape.kind === "const") {
    if (shape.value !== true) return null;

    return frame(
      <Switch
        id={id}
        checked={value === true}
        onCheckedChange={(checked) => onChange(checked ? true : undefined)}
      />,
    );
  }

  if (shape.kind === "boolean") {
    if (!optional || typeof fallback === "boolean") {
      return frame(
        <Switch
          id={id}
          checked={shown === true}
          onCheckedChange={(checked) => onChange(checked)}
        />,
      );
    }

    return frame(
      <ChoiceSelect
        id={id}
        value={value === undefined ? UNSET : String(value)}
        choices={[
          { value: UNSET, label: "Either" },
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ]}
        onChange={(next) =>
          onChange(next === UNSET ? undefined : next === "true")
        }
      />,
    );
  }

  if (shape.kind === "enum" || (shape.kind === "string" && shape.ref)) {
    const known =
      shape.kind === "enum" ? shape.values : (refs[shape.ref!] ?? []);
    const current = typeof shown === "string" ? shown : "";

    if (shape.kind === "string" && known.length === 0) {
      return frame(
        <Input
          id={id}
          value={current}
          onChange={(event) =>
            onChange(
              optional && event.target.value === ""
                ? undefined
                : event.target.value,
            )
          }
        />,
      );
    }

    const values =
      current && !known.includes(current) ? [current, ...known] : known;
    const choices: Choice[] = [
      ...(optional || current === "" ? [{ value: UNSET, label: "None" }] : []),
      ...values.map((item) => ({
        value: item,
        label: shape.kind === "enum" ? humanize(item) : item,
      })),
    ];

    return frame(
      <ChoiceSelect
        id={id}
        value={current === "" ? UNSET : current}
        choices={choices}
        onChange={(next) =>
          onChange(next === UNSET ? (optional ? undefined : "") : next)
        }
      />,
    );
  }

  if (shape.kind === "number") {
    return frame(
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={typeof value === "number" ? String(value) : ""}
        placeholder={
          typeof fallback === "number" ? String(fallback) : undefined
        }
        min={shape.min ?? undefined}
        max={shape.max ?? undefined}
        step={shape.integer ? 1 : "any"}
        onChange={(event) => {
          const text = event.target.value;

          if (text === "") {
            onChange(optional ? undefined : value);

            return;
          }

          const parsed = Number(text);

          if (Number.isFinite(parsed)) onChange(parsed);
        }}
      />,
    );
  }

  const text = typeof value === "string" ? value : "";
  const change = (next: string) =>
    onChange(optional && next === "" ? undefined : next);

  return frame(
    shape.long ? (
      <Textarea
        id={id}
        value={text}
        rows={3}
        onChange={(event) => change(event.target.value)}
      />
    ) : (
      <Input
        id={id}
        value={text}
        onChange={(event) => change(event.target.value)}
      />
    ),
  );
}
