import {
  descriptionOf,
  type JsonSchema,
  labelOf,
  listOf,
  shapeOf,
  unitOf,
} from "@/features/authoring/utils";

import { ArrayField } from "./ArrayField";
import { ChipsField } from "./ChipsField";
import { ObjectField } from "./ObjectField";
import { RawField } from "./RawField";
import { ScalarField } from "./ScalarField";
import { UnionField } from "./UnionField";

export interface SchemaFieldProps {
  name: string;
  schema: JsonSchema;
  path: ReadonlyArray<string | number>;
  value: unknown;
  optional: boolean;
  bare?: boolean;
  cell?: boolean;
  onChange: (value: unknown) => void;
}

export function SchemaField({
  name,
  schema,
  path,
  value,
  optional,
  bare = false,
  cell = false,
  onChange,
}: SchemaFieldProps) {
  const shape = shapeOf(schema);
  const shown =
    value === undefined &&
    "default" in schema &&
    (shape.kind === "object" || shape.kind === "array")
      ? schema.default
      : value;
  const label = labelOf(name, schema);
  const description = descriptionOf(schema);

  switch (shape.kind) {
    case "object":
      return (
        <ObjectField
          shape={shape}
          label={label}
          description={description}
          path={path}
          value={shown}
          bare={bare}
          onChange={onChange}
        />
      );
    case "union":
      return (
        <UnionField
          shape={shape}
          label={label}
          description={description}
          path={path}
          value={value}
          bare={bare}
          onChange={onChange}
        />
      );
    case "array": {
      const items = shapeOf(shape.items);

      if (items.kind === "enum") {
        return (
          <ChipsField
            label={label}
            description={description}
            path={path}
            values={items.values}
            max={shape.maxItems}
            value={value}
            onChange={onChange}
          />
        );
      }

      return (
        <ArrayField
          shape={shape}
          label={label}
          description={description}
          path={path}
          value={value}
          bare={bare}
          onChange={onChange}
        />
      );
    }
    case "tuple":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {shape.items.map((item, index) => (
            <SchemaField
              key={index}
              name={`${name} ${index + 1}`}
              schema={item}
              path={[...path, index]}
              value={listOf(value)[index]}
              optional={false}
              onChange={(next) => {
                const list = [...listOf(value)];

                list[index] = next;
                onChange(list);
              }}
            />
          ))}
        </div>
      );
    case "nullable":
      return (
        <SchemaField
          name={name}
          schema={{
            ...shape.inner,
            title: label,
            description: description ?? undefined,
          }}
          path={path}
          value={value ?? undefined}
          cell={cell}
          optional
          onChange={(next) => onChange(next === undefined ? null : next)}
        />
      );
    case "unknown":
      return (
        <RawField
          label={label}
          description={description}
          path={path}
          value={value}
          onChange={onChange}
        />
      );
    default:
      return (
        <ScalarField
          shape={shape}
          label={label}
          description={description}
          path={path}
          value={value}
          fallback={schema.default}
          unit={unitOf(name, schema)}
          optional={optional}
          bare={cell}
          onChange={onChange}
        />
      );
  }
}
