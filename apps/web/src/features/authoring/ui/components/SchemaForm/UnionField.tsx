import {
  type FieldShape,
  optionIndex,
  optionLabel,
  shapeOf,
  switchOption,
} from "@/features/authoring/utils";

import { ObjectField } from "./ObjectField";
import { ScalarField } from "./ScalarField";

interface UnionFieldProps {
  shape: Extract<FieldShape, { kind: "union" }>;
  label: string;
  description: string | null;
  path: ReadonlyArray<string | number>;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function UnionField({
  shape,
  label,
  description,
  path,
  value,
  onChange,
}: UnionFieldProps) {
  const index = optionIndex(shape.options, shape.discriminator, value);
  const option = shape.options[index]!;
  const inner = shapeOf(option);
  const labels = shape.options.map((item) =>
    optionLabel(item, shape.discriminator),
  );

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <ScalarField
        shape={{ kind: "enum", values: labels }}
        label="Kind"
        description={
          typeof option.description === "string"
            ? option.description
            : description
        }
        path={[...path, shape.discriminator]}
        value={labels[index]}
        optional={false}
        onChange={(next) => {
          const chosen = labels.indexOf(String(next));

          if (chosen >= 0 && chosen !== index) {
            onChange(switchOption(value, shape.options[chosen]!));
          }
        }}
      />
      {inner.kind === "object" ? (
        <ObjectField
          shape={inner}
          label={labels[index]!}
          description={null}
          path={path}
          value={value}
          hide={shape.discriminator}
          bare
          onChange={onChange}
        />
      ) : null}
    </fieldset>
  );
}
