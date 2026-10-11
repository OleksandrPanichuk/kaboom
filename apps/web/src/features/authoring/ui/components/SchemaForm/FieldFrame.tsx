import type { ReactNode } from "react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/Field";
import { samePath } from "@/features/authoring/utils";

import { useSchemaForm } from "./SchemaForm.context";

interface FieldFrameProps {
  id: string;
  label: string;
  description: string | null;
  path: ReadonlyArray<string | number>;
  children: ReactNode;
}

export function FieldFrame({
  id,
  label,
  description,
  path,
  children,
}: FieldFrameProps) {
  const { issues } = useSchemaForm();
  const issue = issues.find((item) => samePath(item.path, path));

  return (
    <Field data-invalid={issue ? true : undefined} data-path={path.join(".")}>
      {label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null}
      {children}
      {issue ? (
        <p role="alert" className="text-sm text-destructive">
          {issue.message}
        </p>
      ) : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </Field>
  );
}
