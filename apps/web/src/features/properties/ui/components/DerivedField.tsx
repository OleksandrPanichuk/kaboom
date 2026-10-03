import type { PropField } from "@repo/design";

import { UNIT_SUFFIXES } from "@/features/properties/constants";
import { optionLabel, toDisplay } from "@/features/properties/utils";

interface DerivedFieldProps {
  field: PropField;
  value: unknown;
  source: string;
}

const shown = (field: PropField, value: unknown): string => {
  if (typeof value === "number") {
    const suffix = field.meta.unit ? UNIT_SUFFIXES[field.meta.unit] : null;
    const text = toDisplay(value, field.meta.unit);

    return suffix ? `${text} ${suffix}` : text;
  }

  if (typeof value === "boolean") return value ? "On" : "Off";

  return typeof value === "string" ? optionLabel(value) : "";
};

export function DerivedField({ field, value, source }: DerivedFieldProps) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium">
        {field.meta.title}
      </span>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {shown(field, value)}
      </span>
      <span className="sr-only">, set by {source}</span>
    </div>
  );
}
