import { cn } from "cn";
import { useId } from "react";

import { humanize } from "@/features/authoring/utils";

import { FieldFrame } from "./FieldFrame";

interface ChipsFieldProps {
  label: string;
  description: string | null;
  path: ReadonlyArray<string | number>;
  values: readonly string[];
  max: number | null;
  value: unknown;
  onChange: (value: string[]) => void;
}

export function ChipsField({
  label,
  description,
  path,
  values,
  max,
  value,
  onChange,
}: ChipsFieldProps) {
  const id = useId();
  const chosen = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
  const full = max !== null && chosen.length >= max;

  return (
    <FieldFrame id={id} label={label} description={description} path={path}>
      <div
        id={id}
        role="group"
        aria-label={label}
        className="flex flex-wrap gap-1.5"
      >
        {values.map((item) => {
          const on = chosen.includes(item);

          return (
            <button
              key={item}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() =>
                onChange(
                  on
                    ? chosen.filter((entry) => entry !== item)
                    : [...chosen, item],
                )
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40",
                on
                  ? "border-interactive-border bg-interactive-surface text-interactive-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/60",
              )}
            >
              {humanize(item)}
            </button>
          );
        })}
      </div>
    </FieldFrame>
  );
}
