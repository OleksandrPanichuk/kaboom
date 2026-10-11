import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  defaultOf,
  type FieldShape,
  listOf,
  shapeOf,
} from "@/features/authoring/utils";

import { FieldFrame } from "./FieldFrame";
import { SchemaField } from "./SchemaField";

interface ArrayFieldProps {
  shape: Extract<FieldShape, { kind: "array" }>;
  label: string;
  description: string | null;
  path: ReadonlyArray<string | number>;
  value: unknown;
  onChange: (value: unknown) => void;
}

const singular = (label: string) =>
  label.endsWith("ies")
    ? `${label.slice(0, -3)}y`
    : label.endsWith("s") && !label.endsWith("ss")
      ? label.slice(0, -1)
      : label;

export function ArrayField({
  shape,
  label,
  description,
  path,
  value,
  onChange,
}: ArrayFieldProps) {
  const list = listOf(value);
  const item =
    typeof shape.items.title === "string" ? shape.items.title : singular(label);
  const scalar = !["object", "union", "array", "tuple"].includes(
    shapeOf(shape.items).kind,
  );
  const full = shape.maxItems !== null && list.length >= shape.maxItems;
  const replace = (index: number, next: unknown) =>
    onChange(list.map((entry, at) => (at === index ? next : entry)));
  const remove = (index: number) =>
    onChange(list.filter((_, at) => at !== index));

  return (
    <FieldFrame
      id={`${path.join("-")}-list`}
      label={label}
      description={description}
      path={path}
    >
      <div className="flex flex-col gap-3">
        {list.map((entry, index) =>
          scalar ? (
            <div key={index} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <SchemaField
                  name={`${item} ${index + 1}`}
                  schema={shape.items}
                  path={[...path, index]}
                  value={entry}
                  optional={false}
                  onChange={(next) => replace(index, next)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${item.toLowerCase()} ${index + 1}`}
                disabled={list.length <= shape.minItems}
                onClick={() => remove(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div key={index} className="relative">
              <SchemaField
                name={`${item} ${index + 1}`}
                schema={{ ...shape.items, title: `${item} ${index + 1}` }}
                path={[...path, index]}
                value={entry}
                optional={false}
                onChange={(next) => replace(index, next)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1 right-1"
                aria-label={`Remove ${item.toLowerCase()} ${index + 1}`}
                disabled={list.length <= shape.minItems}
                onClick={() => remove(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ),
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={full}
          onClick={() => onChange([...list, defaultOf(shape.items)])}
        >
          <Plus aria-hidden="true" />
          Add {item.toLowerCase()}
        </Button>
      </div>
    </FieldFrame>
  );
}
