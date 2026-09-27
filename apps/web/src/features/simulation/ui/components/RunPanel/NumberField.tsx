import { useId, useState } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/Field";
import { DraftInput } from "@/features/properties";

interface NumberFieldProps {
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  integer?: boolean;
  scale?: number;
  onChange: (value: number) => void;
}

export function NumberField({
  label,
  value,
  suffix,
  min,
  max,
  integer = false,
  scale = 1,
  onChange,
}: NumberFieldProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const shown = Math.round(value * scale * 1_000) / 1_000;

  return (
    <Field data-invalid={error ? true : undefined} className="min-w-0 flex-1">
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      <div className="relative">
        <DraftInput
          id={id}
          value={String(shown)}
          inputMode={integer ? "numeric" : "decimal"}
          invalid={error !== null}
          onUnchanged={() => setError(null)}
          onCommit={(text) => {
            const typed = Number(text.trim());

            if (text.trim() === "" || !Number.isFinite(typed)) {
              setError("Enter a number.");
            } else if (integer && !Number.isInteger(typed)) {
              setError("Use a whole number.");
            } else if (typed < min * scale || typed > max * scale) {
              setError(`Between ${min * scale} and ${max * scale}.`);
            } else {
              setError(null);
              onChange(typed / scale);
            }
          }}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? <FieldError className="text-xs">{error}</FieldError> : null}
    </Field>
  );
}
