import { useId } from "react";

import { SegmentedControl } from "@/components/SegmentedControl";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  DIFFICULTY_OPTIONS,
  TRACK_OPTIONS,
} from "@/features/authoring/constants";
import { type DraftContent, textOf } from "@/features/authoring/utils";

import { TagsField } from "./TagsField";

interface DraftDetailsFormProps {
  content: DraftContent;
  locked: { slug: boolean };
  onChange: (key: string, value: unknown) => void;
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
    <div className="grid gap-x-6 gap-y-5 lg:grid-cols-2">
      <Field data-path="title" className="gap-1.5">
        <FieldLabel htmlFor={`${id}-title`} className="text-subtle-foreground">
          Title
        </FieldLabel>
        <Input
          id={`${id}-title`}
          value={textOf(content, "title")}
          maxLength={120}
          onChange={(event) => onChange("title", event.target.value)}
        />
      </Field>
      <Field data-path="slug" className="gap-1.5">
        <FieldLabel htmlFor={`${id}-slug`} className="text-subtle-foreground">
          Address
        </FieldLabel>
        <div className="flex min-w-0 items-center rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-disabled:opacity-60">
          <span className="shrink-0 pl-2.5 font-mono text-sm text-muted-foreground">
            /problems/
          </span>
          <Input
            id={`${id}-slug`}
            value={textOf(content, "slug")}
            disabled={locked.slug}
            spellCheck={false}
            className="border-0 pl-0.5 font-mono focus-visible:ring-0 disabled:bg-transparent"
            onChange={(event) =>
              onChange("slug", event.target.value.toLowerCase())
            }
          />
        </div>
        <FieldDescription>
          {locked.slug
            ? "A published problem keeps its address."
            : "Lowercase words joined by hyphens."}
        </FieldDescription>
      </Field>
      <Field data-path="track" className="gap-1.5">
        <span className="text-sm font-medium text-subtle-foreground">
          Track
        </span>
        <div>
          <SegmentedControl
            name={`${id}-track`}
            label="Track"
            value={textOf(content, "track")}
            options={TRACK_OPTIONS}
            onChange={(value) => onChange("track", value)}
          />
        </div>
      </Field>
      <Field data-path="difficulty" className="gap-1.5">
        <span className="text-sm font-medium text-subtle-foreground">
          Difficulty
        </span>
        <div>
          <SegmentedControl
            name={`${id}-difficulty`}
            label="Difficulty"
            value={textOf(content, "difficulty")}
            options={DIFFICULTY_OPTIONS}
            onChange={(value) => onChange("difficulty", value)}
          />
        </div>
      </Field>
      <div data-path="tags" className="lg:col-span-2">
        <TagsField value={tags} onChange={(next) => onChange("tags", next)} />
      </div>
      <Field data-path="summary" className="gap-1.5 lg:col-span-2">
        <FieldLabel
          htmlFor={`${id}-summary`}
          className="text-subtle-foreground"
        >
          Summary
        </FieldLabel>
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
