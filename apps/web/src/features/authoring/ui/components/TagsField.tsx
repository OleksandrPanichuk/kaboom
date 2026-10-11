import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { type KeyboardEvent, useId, useMemo, useState } from "react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/Field";
import { ALL_PROBLEMS, problemsQuery } from "@/features/problems";

interface TagsFieldProps {
  value: readonly string[];
  onChange: (tags: string[]) => void;
}

const MAX_TAGS = 10;
const MAX_LENGTH = 40;
const SHOWN = 8;

const clean = (tag: string) => tag.trim().toLowerCase().slice(0, MAX_LENGTH);

export function TagsField({ value, onChange }: TagsFieldProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const { data } = useQuery(problemsQuery(ALL_PROBLEMS));
  const known = useMemo(
    () =>
      [
        ...new Set((data?.items ?? []).flatMap((problem) => problem.tags)),
      ].sort(),
    [data],
  );
  const full = value.length >= MAX_TAGS;
  const query = clean(text);
  const suggestions = known
    .filter((tag) => !value.includes(tag) && tag.includes(query))
    .slice(0, SHOWN);

  const add = (raw: string) => {
    const tag = clean(raw);

    if (tag !== "" && !value.includes(tag) && !full) onChange([...value, tag]);

    setText("");
  };

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(text);
    } else if (event.key === "Backspace" && text === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Field>
      <FieldLabel htmlFor={id}>Tags</FieldLabel>
      <div className="relative">
        <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-0.5 pr-1 pl-2 text-xs font-medium text-indigo-800"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                className="grid size-4 place-items-center rounded-full hover:bg-indigo-100"
                onClick={() => onChange(value.filter((item) => item !== tag))}
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </span>
          ))}
          <input
            id={id}
            value={text}
            disabled={full}
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={`${id}-suggestions`}
            aria-autocomplete="list"
            placeholder={
              full
                ? "Ten tags at most"
                : value.length === 0
                  ? "caching, queues…"
                  : ""
            }
            className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
            onChange={(event) => {
              setText(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setOpen(false);
              if (text.trim() !== "") add(text);
            }}
            onKeyDown={keyDown}
          />
        </div>
        {open && suggestions.length > 0 && !full ? (
          <ul
            id={`${id}-suggestions`}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border bg-popover p-1 shadow-md"
          >
            {suggestions.map((tag) => (
              <li key={tag} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-100"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    add(tag);
                  }}
                >
                  {tag}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <FieldDescription>
        Pick from the tags problems already use, or type a new one and press
        Enter. Up to ten.
      </FieldDescription>
    </Field>
  );
}
