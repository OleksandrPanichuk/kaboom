import { useMemo } from "react";

import type { JsonSchema } from "@/features/authoring/utils";

import { SchemaField } from "./SchemaField";
import {
  SchemaFormContext,
  type SchemaFormIssue,
  type SchemaFormReveal,
} from "./SchemaForm.context";

interface SchemaFormProps {
  name: string;
  schema: JsonSchema;
  value: unknown;
  path: ReadonlyArray<string | number>;
  refs: Readonly<Record<string, readonly string[]>>;
  issues: readonly SchemaFormIssue[];
  reveal?: SchemaFormReveal | null;
  onChange: (value: unknown) => void;
}

export function SchemaForm({
  name,
  schema,
  value,
  path,
  refs,
  issues,
  reveal = null,
  onChange,
}: SchemaFormProps) {
  const context = useMemo(
    () => ({ refs, issues, reveal }),
    [refs, issues, reveal],
  );

  return (
    <SchemaFormContext.Provider value={context}>
      <div className="@container">
        <SchemaField
          name={name}
          schema={schema}
          path={path}
          value={value}
          optional={false}
          bare
          onChange={onChange}
        />
      </div>
    </SchemaFormContext.Provider>
  );
}
