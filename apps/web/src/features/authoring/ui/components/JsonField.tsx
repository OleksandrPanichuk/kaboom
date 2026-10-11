import { useId, useState } from "react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";

interface JsonFieldProps {
  label: string;
  description: string;
  value: unknown;
  optional?: boolean;
  onChange: (value: unknown) => void;
}

const show = (value: unknown) =>
  value === undefined ? "" : JSON.stringify(value, null, 2);

export function JsonField({
  label,
  description,
  value,
  optional = false,
  onChange,
}: JsonFieldProps) {
  const id = useId();
  const [text, setText] = useState(() => show(value));
  const [error, setError] = useState<string | null>(null);

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        value={text}
        spellCheck={false}
        rows={Math.min(24, Math.max(6, text.split("\n").length + 1))}
        aria-invalid={error ? true : undefined}
        className="font-mono text-xs leading-5"
        onChange={(event) => {
          const next = event.target.value;

          setText(next);

          if (optional && next.trim() === "") {
            setError(null);
            onChange(undefined);

            return;
          }

          try {
            onChange(JSON.parse(next) as unknown);
            setError(null);
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : "Not valid JSON",
            );
          }
        }}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Not saved until it is valid JSON: {error}
        </p>
      ) : (
        <FieldDescription>{description}</FieldDescription>
      )}
    </Field>
  );
}
