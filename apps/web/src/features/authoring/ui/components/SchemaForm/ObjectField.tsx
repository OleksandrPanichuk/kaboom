import { cn } from "cn";
import { Plus, X } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/Button";
import {
  defaultOf,
  type FieldShape,
  type JsonSchema,
  labelOf,
  shapeOf,
} from "@/features/authoring/utils";

import { GroupHeading } from "./GroupHeading";
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
const SCALAR = new Set(["string", "number", "enum", "boolean", "nullable"]);

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const compact = (schema: JsonSchema) => {
  const shape = shapeOf(schema);

  return (
    shape.kind === "object" &&
    Object.keys(shape.properties).length <= 3 &&
    Object.values(shape.properties).every((field) => {
      const inner = shapeOf(field);

      return SCALAR.has(inner.kind) && !(inner.kind === "string" && inner.long);
    })
  );
};

const spanOf = (schema: JsonSchema) => {
  const field = shapeOf(schema);

  if (field.kind === "object") {
    return compact(schema) ? "@xl:col-span-2" : "col-span-full";
  }

  if (COMPLEX.has(field.kind)) return "col-span-full";

  return field.kind === "string" && field.long ? "col-span-full" : undefined;
};

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
  const headingId = useId();
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
  const nestedCompact = compact({ type: "object", ...shape });
  const body = (
    <div
      className={cn(
        "grid gap-x-4 gap-y-4",
        nestedCompact && !bare
          ? "@sm:grid-cols-2"
          : "@xl:grid-cols-2 @3xl:grid-cols-3",
      )}
    >
      {entries.map(([key, schema]) => {
        const optional = !shape.required.includes(key) || "default" in schema;
        const kind = shapeOf(schema).kind;
        const removable =
          optional && COMPLEX.has(kind) && !("default" in schema);

        if (removable && current[key] === undefined) {
          return (
            <div key={key} className="col-span-full">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 text-interactive-foreground"
                onClick={() => set(key, defaultOf(schema))}
              >
                <Plus aria-hidden="true" />
                Add {labelOf(key, schema).toLowerCase()}
              </Button>
            </div>
          );
        }

        return (
          <div key={key} className={cn("relative min-w-0", spanOf(schema))}>
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
    <div
      role="group"
      aria-labelledby={headingId}
      data-path={path.join(".")}
      className={cn(
        "flex flex-col gap-3",
        !nestedCompact && "border-t border-border pt-4",
      )}
    >
      <GroupHeading id={headingId} label={label} description={description} />
      {body}
    </div>
  );
}
