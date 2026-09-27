import { type KeyboardEvent, useState } from "react";

import { Input } from "@/components/ui/Input";

interface DraftInputProps {
  id: string;
  value: string;
  inputMode?: "decimal" | "numeric" | "text";
  maxLength?: number;
  placeholder?: string;
  invalid: boolean;
  describedBy?: string;
  onCommit: (text: string) => void;
  onUnchanged?: () => void;
}

export function DraftInput({
  id,
  value,
  inputMode = "text",
  maxLength,
  placeholder,
  invalid,
  describedBy,
  onCommit,
  onUnchanged,
}: DraftInputProps) {
  const [draft, setDraft] = useState(value);
  const [source, setSource] = useState(value);

  if (source !== value) {
    setSource(value);
    setDraft(value);
  }

  const commit = () => {
    if (draft !== value) onCommit(draft);
    else onUnchanged?.();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      setDraft(value);
      onUnchanged?.();
    }
  };

  return (
    <Input
      id={id}
      value={draft}
      inputMode={inputMode}
      maxLength={maxLength}
      placeholder={placeholder}
      autoComplete="off"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  );
}
