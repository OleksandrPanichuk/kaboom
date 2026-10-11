import { authoringSchema, type AuthoringSection } from "@repo/scoring";
import { Braces, ListTree, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { defaultOf } from "@/features/authoring/utils";

import { JsonField } from "./JsonField";
import { SchemaForm } from "./SchemaForm";

interface Issue {
  path: Array<string | number>;
  message: string;
}

interface SchemaSectionProps {
  section: AuthoringSection;
  noun: string;
  value: unknown;
  refs: Readonly<Record<string, readonly string[]>>;
  issues: readonly Issue[];
  optional?: boolean;
  onChange: (value: unknown) => void;
}

export function SchemaSection({
  section,
  noun,
  value,
  refs,
  issues,
  optional = false,
  onChange,
}: SchemaSectionProps) {
  const schema = useMemo(() => authoringSchema(section), [section]);
  const [raw, setRaw] = useState(false);

  if (optional && value === undefined) {
    return (
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => onChange(defaultOf(schema))}
      >
        <Plus aria-hidden="true" />
        Add {noun}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={raw}
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
            Remove {noun}
          </Button>
        ) : null}
      </div>
      {raw ? (
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
          onChange={onChange}
        />
      )}
    </div>
  );
}
