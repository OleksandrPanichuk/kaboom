import { useId } from "react";

import { SegmentedControl } from "@/components/SegmentedControl";
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
import {
  type FieldShape,
  type FieldUnit,
  humanize,
  samePath,
} from "@/features/authoring/utils";

import { FieldFrame } from "./FieldFrame";
import { NumberInput } from "./NumberInput";
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
  unit?: FieldUnit | null;
  optional: boolean;
  bare?: boolean;
  verbatim?: boolean;
  onChange: (value: unknown) => void;
}

const UNSET = "__unset__";
const SEGMENTED_MAX = 4;
const SEGMENTED_LETTERS = 36;

interface Choice {
  value: string;
  label: string;
}

function ChoiceSelect({
  id,
  label,
  value,
  choices,
  onChange,
}: {
  id: string;
  label?: string;
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
      <SelectTrigger id={id} aria-label={label} className="w-full">
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

const segmented = (choices: readonly Choice[]) =>
  choices.length <= SEGMENTED_MAX &&
  choices.reduce((total, choice) => total + choice.label.length, 0) <=
    SEGMENTED_LETTERS;

export function ScalarField({
  shape,
  label,
  description,
  path,
  value,
  fallback,
  unit = null,
  optional,
  bare = false,
  verbatim = false,
  onChange,
}: ScalarFieldProps) {
  const shown = value === undefined ? fallback : value;
  const id = useId();
  const { refs, issues } = useSchemaForm();
  const invalid = issues.some((item) => samePath(item.path, path));
  const frame = (control: React.ReactNode) =>
    bare ? (
      control
    ) : (
      <FieldFrame id={id} label={label} description={description} path={path}>
        {control}
      </FieldFrame>
    );
  const choose = (
    current: string,
    choices: Choice[],
    change: (next: string) => void,
  ) =>
    !bare && segmented(choices) ? (
      <div>
        <SegmentedControl
          id={id}
          name={id}
          label={label}
          value={current}
          options={choices}
          onChange={change}
        />
      </div>
    ) : (
      <ChoiceSelect
        id={id}
        label={bare ? label : undefined}
        value={current}
        choices={choices}
        onChange={change}
      />
    );

  if (shape.kind === "const") {
    if (shape.value !== true) return null;

    return frame(
      <Switch
        id={id}
        aria-label={bare ? label : undefined}
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
          aria-label={bare ? label : undefined}
          checked={shown === true}
          onCheckedChange={(checked) => onChange(checked)}
        />,
      );
    }

    return frame(
      choose(
        value === undefined ? UNSET : String(value),
        [
          { value: UNSET, label: "Either" },
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ],
        (next) => onChange(next === UNSET ? undefined : next === "true"),
      ),
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
          aria-label={bare ? label : undefined}
          aria-invalid={invalid || undefined}
          value={current}
          className="font-mono"
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
      ...((optional && fallback === undefined) || current === ""
        ? [{ value: UNSET, label: "None" }]
        : []),
      ...values.map((item) => ({
        value: item,
        label: shape.kind === "enum" && !verbatim ? humanize(item) : item,
      })),
    ];

    return frame(
      choose(current === "" ? UNSET : current, choices, (next) =>
        onChange(next === UNSET ? (optional ? undefined : "") : next),
      ),
    );
  }

  if (shape.kind === "number") {
    return frame(
      <NumberInput
        id={id}
        label={bare ? label : undefined}
        value={value}
        fallback={fallback}
        unit={unit}
        integer={shape.integer}
        min={shape.min}
        max={shape.max}
        optional={optional}
        invalid={invalid}
        onChange={onChange}
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
        aria-label={bare ? label : undefined}
        aria-invalid={invalid || undefined}
        value={text}
        rows={3}
        onChange={(event) => change(event.target.value)}
      />
    ) : (
      <Input
        id={id}
        aria-label={bare ? label : undefined}
        aria-invalid={invalid || undefined}
        value={text}
        onChange={(event) => change(event.target.value)}
      />
    ),
  );
}
