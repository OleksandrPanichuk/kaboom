import { cn } from "cn";
import { X } from "lucide-react";
import { useId } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
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

const ALL_SHOWN = 12;

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
  const toggle = (item: string) =>
    onChange(
      chosen.includes(item)
        ? chosen.filter((entry) => entry !== item)
        : [...chosen, item],
    );

  if (values.length > ALL_SHOWN) {
    const rest = values.filter((item) => !chosen.includes(item));
    const items = rest.map((item) => ({ value: item, label: humanize(item) }));

    return (
      <FieldFrame id={id} label={label} description={description} path={path}>
        <div className="flex flex-wrap items-center gap-1.5">
          {chosen.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1 rounded-full border border-interactive-border bg-interactive-surface py-0.5 pr-1 pl-2.5 text-xs font-medium text-interactive-foreground"
            >
              {humanize(item)}
              <button
                type="button"
                aria-label={`Remove ${humanize(item).toLowerCase()}`}
                onClick={() => toggle(item)}
                className="rounded-full p-0.5 hover:bg-interactive/10"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </span>
          ))}
          <Select
            value={null}
            items={items}
            onValueChange={(next) => {
              if (typeof next === "string") toggle(next);
            }}
          >
            <SelectTrigger
              id={id}
              size="sm"
              disabled={full || rest.length === 0}
              className="h-7 border-dashed text-muted-foreground"
            >
              <SelectValue placeholder="Add" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FieldFrame>
    );
  }

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
              onClick={() => toggle(item)}
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
