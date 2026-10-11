import { cn } from "cn";
import { Plus, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  defaultOf,
  type FieldShape,
  isFlatItem,
  labelOf,
  listOf,
  shapeOf,
  singular,
  summaryOf,
} from "@/features/authoring/utils";

import { GroupHeading } from "./GroupHeading";
import { ItemRow } from "./ItemRow";
import { SchemaField } from "./SchemaField";
import { useSchemaForm } from "./SchemaForm.context";

interface ArrayFieldProps {
  shape: Extract<FieldShape, { kind: "array" }>;
  label: string;
  description: string | null;
  path: ReadonlyArray<string | number>;
  value: unknown;
  bare?: boolean;
  onChange: (value: unknown) => void;
}

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export function ArrayField({
  shape,
  label,
  description,
  path,
  value,
  bare = false,
  onChange,
}: ArrayFieldProps) {
  const headingId = useId();
  const { issues } = useSchemaForm();
  const list = listOf(value);
  const [fresh, setFresh] = useState<number | null>(null);
  const item =
    typeof shape.items.title === "string" ? shape.items.title : singular(label);
  const noun = item.toLowerCase();
  const itemShape = shapeOf(shape.items);
  const scalar = !["object", "union", "array", "tuple"].includes(
    itemShape.kind,
  );
  const flat = isFlatItem(shape.items) && itemShape.kind === "object";
  const full = shape.maxItems !== null && list.length >= shape.maxItems;
  const removable = list.length > shape.minItems;
  const replace = (index: number, next: unknown) =>
    onChange(list.map((entry, at) => (at === index ? next : entry)));
  const remove = (index: number) =>
    onChange(list.filter((_, at) => at !== index));
  const add = () => {
    setFresh(list.length);
    onChange([...list, defaultOf(shape.items)]);
  };
  const ownIssue = issues.find(
    (issue) => issue.path.join(".") === path.join("."),
  );

  const addButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 self-start text-interactive-foreground"
      disabled={full}
      onClick={add}
    >
      <Plus aria-hidden="true" />
      Add {noun}
    </Button>
  );

  const body = (() => {
    if (scalar) {
      return list.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <SchemaField
              name={`${item} ${index + 1}`}
              schema={shape.items}
              path={[...path, index]}
              value={entry}
              optional={false}
              cell
              onChange={(next) => replace(index, next)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${noun} ${index + 1}`}
            disabled={!removable}
            onClick={() => remove(index)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ));
    }

    if (flat && itemShape.kind === "object") {
      const columns = Object.entries(itemShape.properties);
      const template = {
        gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) 2rem`,
      };

      if (list.length === 0) return null;

      return (
        <div className="overflow-hidden rounded-xl border border-border">
          <div
            aria-hidden="true"
            className="grid gap-2 bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground"
            style={template}
          >
            {columns.map(([key, schema]) => (
              <span key={key} className="truncate">
                {labelOf(key, schema)}
              </span>
            ))}
          </div>
          {list.map((entry, index) => (
            <div
              key={index}
              role="group"
              aria-label={`${item} ${index + 1}`}
              data-path={[...path, index].join(".")}
              className="grid items-center gap-2 border-t border-border px-3 py-2"
              style={template}
            >
              {columns.map(([key, schema]) => (
                <SchemaField
                  key={key}
                  name={key}
                  schema={schema}
                  path={[...path, index, key]}
                  value={record(entry)[key]}
                  optional={!itemShape.required.includes(key)}
                  cell
                  onChange={(next) => {
                    const copy = { ...record(entry) };

                    if (next === undefined) delete copy[key];
                    else copy[key] = next;

                    replace(index, copy);
                  }}
                />
              ))}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${noun} ${index + 1}`}
                disabled={!removable}
                onClick={() => remove(index)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      );
    }

    return list.map((entry, index) => (
      <ItemRow
        key={index}
        path={[...path, index]}
        noun={item}
        index={index}
        summary={summaryOf(shape.items, entry)}
        defaultOpen={index === fresh}
        removable={removable}
        onRemove={() => remove(index)}
      >
        <SchemaField
          name={`${item} ${index + 1}`}
          schema={shape.items}
          path={[...path, index]}
          value={entry}
          optional={false}
          bare
          onChange={(next) => replace(index, next)}
        />
      </ItemRow>
    ));
  })();

  return (
    <div
      role={bare ? undefined : "group"}
      aria-labelledby={bare ? undefined : headingId}
      data-path={path.join(".")}
      className="flex flex-col gap-2"
    >
      {bare ? null : (
        <GroupHeading id={headingId} label={label} description={description} />
      )}
      {list.length === 0 && !bare ? (
        <p className="text-sm text-muted-foreground">None yet.</p>
      ) : null}
      <div className={cn("flex flex-col", scalar ? "gap-1.5" : "gap-2")}>
        {body}
      </div>
      {ownIssue ? (
        <p role="alert" className="text-sm text-destructive">
          {ownIssue.message}
        </p>
      ) : null}
      {addButton}
    </div>
  );
}
