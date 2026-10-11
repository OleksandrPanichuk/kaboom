import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  defaultOf,
  type FieldShape,
  labelOf,
  shapeOf,
} from "@/features/authoring/utils";

import { SchemaField } from "./SchemaField";

interface ObjectFieldProps {
  shape: Extract<FieldShape, { kind: "object" }>;
  label: string;
  description: string | null;
  path: ReadonlyArray<string | number>;
  value: unknown;
  onChange: (value: unknown) => void;
  hide?: string;
  bare?: boolean;
}

const COMPLEX = new Set(["object", "array", "union", "tuple"]);

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export function ObjectField({
  shape,
  label,
  description,
  path,
  value,
  onChange,
  hide,
  bare = false,
}: ObjectFieldProps) {
  const current = record(value);
  const set = (key: string, next: unknown) => {
    const copy = { ...current };

    if (next === undefined) delete copy[key];
    else copy[key] = next;

    onChange(copy);
  };
  const entries = Object.entries(shape.properties).filter(
    ([key, schema]) =>
      key !== hide && (!("const" in schema) || schema.const === true),
  );
  const body = (
    <div className="grid gap-4 sm:grid-cols-2">
      {entries.map(([key, schema]) => {
        const optional = !shape.required.includes(key) || "default" in schema;
        const field = shapeOf(schema);
        const kind = field.kind;
        const wide =
          COMPLEX.has(kind) || (field.kind === "string" && field.long);
        const removable =
          optional && COMPLEX.has(kind) && !("default" in schema);

        if (removable && current[key] === undefined) {
          return (
            <div key={key} className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set(key, defaultOf(schema))}
              >
                <Plus aria-hidden="true" />
                Add {labelOf(key, schema).toLowerCase()}
              </Button>
            </div>
          );
        }

        return (
          <div
            key={key}
            className={wide ? "relative sm:col-span-2" : undefined}
          >
            <SchemaField
              name={key}
              schema={schema}
              path={[...path, key]}
              value={current[key]}
              optional={optional}
              onChange={(next) => set(key, next)}
            />
            {removable ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-0 right-0"
                aria-label={`Remove ${labelOf(key, schema).toLowerCase()}`}
                onClick={() => set(key, undefined)}
              >
                <X aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  if (bare) return body;

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      {description ? (
        <p className="-mt-1 text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}
      {body}
    </fieldset>
  );
}
