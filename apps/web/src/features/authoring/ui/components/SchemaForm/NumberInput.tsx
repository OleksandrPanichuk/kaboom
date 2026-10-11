import { cn } from "cn";
import { useState } from "react";

import { Input } from "@/components/ui/Input";
import {
  type FieldUnit,
  formatClock,
  formatShare,
  parseClock,
  parseShare,
} from "@/features/authoring/utils";

interface NumberInputProps {
  id: string;
  label?: string;
  value: unknown;
  fallback?: unknown;
  unit: FieldUnit | null;
  integer: boolean;
  min: number | null;
  max: number | null;
  optional: boolean;
  invalid?: boolean;
  onChange: (value: number | undefined) => void;
}

const format = (value: number, unit: FieldUnit | null) =>
  unit?.kind === "clock"
    ? formatClock(value)
    : unit?.kind === "share"
      ? formatShare(value)
      : String(value);

const parse = (text: string, unit: FieldUnit | null): number | null => {
  if (unit?.kind === "clock") return parseClock(text);
  if (unit?.kind === "share") return parseShare(text);

  const value = Number(text);

  return text.trim() !== "" && Number.isFinite(value) ? value : null;
};

export function NumberInput({
  id,
  label,
  value,
  fallback,
  unit,
  integer,
  min,
  max,
  optional,
  invalid,
  onChange,
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (typeof value === "number" ? format(value, unit) : "");
  const suffix =
    unit?.kind === "share" ? "%" : unit?.kind === "suffix" ? unit.suffix : null;
  const clock = unit?.kind === "clock";
  const textual = clock || unit?.kind === "share";
  const scale = unit?.kind === "share" ? 100 : 1;

  return (
    <div className="relative">
      <Input
        id={id}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        type={textual ? "text" : "number"}
        inputMode={clock ? "numeric" : "decimal"}
        value={shown}
        placeholder={
          typeof fallback === "number"
            ? format(fallback, unit)
            : clock
              ? "m:ss"
              : undefined
        }
        min={!textual && min !== null ? min * scale : undefined}
        max={!textual && max !== null ? max * scale : undefined}
        step={textual ? undefined : integer ? 1 : "any"}
        className={cn(
          "tabular-nums",
          clock && "font-mono",
          suffix &&
            cn(
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              suffix.length > 2 ? "pr-12" : "pr-8",
            ),
        )}
        onChange={(event) => {
          const text = event.target.value;

          setDraft(text);

          if (text.trim() === "") {
            if (optional) onChange(undefined);

            return;
          }

          const parsed = parse(text, unit);

          if (parsed !== null) onChange(parsed);
        }}
        onBlur={() => setDraft(null)}
      />
      {suffix ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground"
        >
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
