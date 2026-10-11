import { useId } from "react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  DIFFICULTY_OPTIONS,
  TRACK_OPTIONS,
} from "@/features/authoring/constants";
import {
  type DraftContent,
  tagsFromText,
  textOf,
} from "@/features/authoring/utils";

interface DraftDetailsFormProps {
  content: DraftContent;
  locked: { slug: boolean };
  onChange: (key: string, value: unknown) => void;
}

interface Option {
  value: string;
  label: string;
}

function Choice({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onChange(next);
        }}
        items={[...options]}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function DraftDetailsForm({
  content,
  locked,
  onChange,
}: DraftDetailsFormProps) {
  const id = useId();
  const tags = Array.isArray(content.tags)
    ? content.tags.filter((tag): tag is string => typeof tag === "string")
    : [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
        <Input
          id={`${id}-title`}
          value={textOf(content, "title")}
          maxLength={120}
          onChange={(event) => onChange("title", event.target.value)}
        />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${id}-slug`}>Slug</FieldLabel>
        <Input
          id={`${id}-slug`}
          value={textOf(content, "slug")}
          disabled={locked.slug}
          spellCheck={false}
          onChange={(event) =>
            onChange("slug", event.target.value.toLowerCase())
          }
        />
        <FieldDescription>
          {locked.slug
            ? "A published problem keeps its address."
            : "Its address, /problems/…; lowercase words joined by hyphens."}
        </FieldDescription>
      </Field>
      <Choice
        id={`${id}-track`}
        label="Track"
        value={textOf(content, "track")}
        options={TRACK_OPTIONS}
        onChange={(value) => onChange("track", value)}
      />
      <Choice
        id={`${id}-difficulty`}
        label="Difficulty"
        value={textOf(content, "difficulty")}
        options={DIFFICULTY_OPTIONS}
        onChange={(value) => onChange("difficulty", value)}
      />
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${id}-tags`}>Tags</FieldLabel>
        <Input
          id={`${id}-tags`}
          defaultValue={tags.join(", ")}
          placeholder="caching, queues"
          onBlur={(event) => onChange("tags", tagsFromText(event.target.value))}
        />
        <FieldDescription>Separated by commas, up to ten.</FieldDescription>
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`${id}-summary`}>Summary</FieldLabel>
        <Textarea
          id={`${id}-summary`}
          value={textOf(content, "summary")}
          rows={2}
          maxLength={280}
          onChange={(event) => onChange("summary", event.target.value)}
        />
        <FieldDescription>
          One or two sentences shown in the problem list.
        </FieldDescription>
      </Field>
    </div>
  );
}
