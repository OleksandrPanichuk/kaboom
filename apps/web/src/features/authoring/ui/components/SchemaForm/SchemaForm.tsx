import { useMemo } from "react";

import type { JsonSchema } from "@/features/authoring/utils";

import { SchemaField } from "./SchemaField";
import { SchemaFormContext, type SchemaFormIssue } from "./SchemaForm.context";

interface SchemaFormProps {
  name: string;
  schema: JsonSchema;
  value: unknown;
  path: ReadonlyArray<string | number>;
  refs: Readonly<Record<string, readonly string[]>>;
  issues: readonly SchemaFormIssue[];
  onChange: (value: unknown) => void;
}

export function SchemaForm({
  name,
  schema,
  value,
  path,
  refs,
  issues,
  onChange,
}: SchemaFormProps) {
  const context = useMemo(() => ({ refs, issues }), [refs, issues]);

  return (
    <SchemaFormContext.Provider value={context}>
      <SchemaField
        name={name}
        schema={schema}
        path={path}
        value={value}
        optional={false}
        onChange={onChange}
      />
    </SchemaFormContext.Provider>
  );
}
