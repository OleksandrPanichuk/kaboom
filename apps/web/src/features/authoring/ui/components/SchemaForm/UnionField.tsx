import { cn } from "cn";
import { useId } from "react";

import {
  type FieldShape,
  optionIndex,
  optionLabel,
  shapeOf,
  switchOption,
} from "@/features/authoring/utils";

import { GroupHeading } from "./GroupHeading";
import { ObjectField } from "./ObjectField";
import { ScalarField } from "./ScalarField";

interface UnionFieldProps {
  shape: Extract<FieldShape, { kind: "union" }>;
  label: string;
  description: string | null;
  path: ReadonlyArray<string | number>;
  value: unknown;
  bare?: boolean;
  onChange: (value: unknown) => void;
}

export function UnionField({
  shape,
  label,
  description,
  path,
  value,
  bare = false,
  onChange,
}: UnionFieldProps) {
  const headingId = useId();
  const index = optionIndex(shape.options, shape.discriminator, value);
  const option = shape.options[index]!;
  const inner = shapeOf(option);
  const labels = shape.options.map((item) =>
    optionLabel(item, shape.discriminator),
  );
  const optionDescription =
    typeof option.description === "string" ? option.description : null;

  return (
    <div
      role="group"
      aria-labelledby={bare ? undefined : headingId}
      data-path={path.join(".")}
      className={cn(
        "flex flex-col gap-4",
        !bare && "border-t border-border pt-4",
      )}
    >
      {bare ? null : (
        <GroupHeading id={headingId} label={label} description={description} />
      )}
      <div className="max-w-md">
        <ScalarField
          shape={{ kind: "enum", values: labels }}
          label={bare ? "Kind" : "Which"}
          description={optionDescription}
          path={[...path, shape.discriminator]}
          value={labels[index]}
          optional={false}
          verbatim
          onChange={(next) => {
            const chosen = labels.indexOf(String(next));

            if (chosen >= 0 && chosen !== index) {
              onChange(switchOption(value, shape.options[chosen]!));
            }
          }}
        />
      </div>
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
    </div>
  );
}
