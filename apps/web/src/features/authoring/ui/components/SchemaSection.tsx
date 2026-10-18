import { authoringSchema, type AuthoringSection } from "@repo/scoring";
import { Braces, ListTree, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { defaultOf } from "@/features/authoring/utils";

import { EditorSection } from "./EditorSection";
import { JsonField } from "./JsonField";
import { SchemaForm, type SchemaFormReveal } from "./SchemaForm";

interface Issue {
  path: Array<string | number>;
  message: string;
}

interface SchemaSectionProps {
  id: string;
  title: string;
  description: string;
  section: AuthoringSection;
  noun: string;
  value: unknown;
  refs: Readonly<Record<string, readonly string[]>>;
  issues: readonly Issue[];
  issueCount: number;
  strict: boolean;
  reveal: SchemaFormReveal | null;
  optional?: boolean;
  extra?: ReactNode;
  onChange: (value: unknown) => void;
}

export function SchemaSection({
  id,
  title,
  description,
  section,
  noun,
  value,
  refs,
  issues,
  issueCount,
  strict,
  reveal,
  optional = false,
  extra,
  onChange,
}: SchemaSectionProps) {
  const schema = useMemo(() => authoringSchema(section), [section]);
  const [raw, setRaw] = useState(false);
  const absent = optional && value === undefined;

  return (
    <EditorSection
      id={id}
      title={title}
      description={description}
      issues={issueCount}
      actions={
        absent ? null : (
          <>
            {extra}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={raw}
              className="text-interactive-foreground"
              onClick={() => setRaw((current) => !current)}
            >
              {raw ? (
                <ListTree aria-hidden="true" />
              ) : (
                <Braces aria-hidden="true" />
              )}
              {raw ? "Edit as a form" : "Edit as JSON"}
            </Button>
            {optional ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(undefined)}
              >
                <Trash2 aria-hidden="true" />
                Remove
              </Button>
            ) : null}
          </>
        )
      }
    >
      {absent ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => onChange(defaultOf(schema))}
        >
          <Plus aria-hidden="true" />
          Add {noun}
        </Button>
      ) : raw ? (
        <JsonField
          label={noun}
          description="The same content as the form, as the API stores it."
          value={value}
          optional={optional}
          onChange={onChange}
        />
      ) : (
        <SchemaForm
          name=""
          schema={schema}
          value={value}
          path={[section]}
          refs={refs}
          issues={issues}
          strict={strict}
          reveal={reveal}
          onChange={onChange}
        />
      )}
    </EditorSection>
  );
}
