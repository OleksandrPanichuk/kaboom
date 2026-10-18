import { useCallback, useMemo, useState } from "react";

import { type JsonSchema, visibleIssues } from "@/features/authoring/utils";

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
  strict?: boolean;
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
  strict = false,
  reveal = null,
  onChange,
}: SchemaFormProps) {
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const touch = useCallback((at: ReadonlyArray<string | number>) => {
    const key = at.join(".");

    setTouched((current) =>
      current.has(key) ? current : new Set(current).add(key),
    );
  }, []);
  const context = useMemo(
    () => ({
      refs,
      issues: visibleIssues(issues, { strict, touched, reveal }),
      reveal,
      touch,
    }),
    [refs, issues, strict, touched, reveal, touch],
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
