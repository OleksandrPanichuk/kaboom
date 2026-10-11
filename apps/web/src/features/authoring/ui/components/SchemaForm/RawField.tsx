import { useId, useState } from "react";

import { Textarea } from "@/components/ui/Textarea";

import { FieldFrame } from "./FieldFrame";

interface RawFieldProps {
  label: string;
  description: string | null;
  path: ReadonlyArray<string | number>;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function RawField({
  label,
  description,
  path,
  value,
  onChange,
}: RawFieldProps) {
  const id = useId();
  const [text, setText] = useState(() =>
    value === undefined ? "" : JSON.stringify(value, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <FieldFrame
      id={id}
      label={label}
      description={error ? `Not valid JSON: ${error}` : description}
      path={path}
    >
      <Textarea
        id={id}
        value={text}
        rows={4}
        spellCheck={false}
        className="font-mono text-xs"
        onChange={(event) => {
          setText(event.target.value);

          try {
            onChange(JSON.parse(event.target.value) as unknown);
            setError(null);
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : "invalid");
          }
        }}
      />
    </FieldFrame>
  );
}
