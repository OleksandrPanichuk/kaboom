import { Info } from "lucide-react";
import { type ReactNode, useState } from "react";

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
  const [help, setHelp] = useState(false);
  const helpId = `${id}-help`;

  return (
    <Field
      data-invalid={issue ? true : undefined}
      data-path={path.join(".")}
      className="gap-1.5"
    >
      {label ? (
        <div className="flex min-h-5 items-center gap-1">
          <FieldLabel htmlFor={id} className="text-subtle-foreground">
            {label}
          </FieldLabel>
          {description ? (
            <button
              type="button"
              aria-label={`About ${label.toLowerCase()}`}
              aria-expanded={help}
              aria-controls={helpId}
              onClick={() => setHelp((current) => !current)}
              className="rounded-full p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:text-interactive"
            >
              <Info aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
      {children}
      {help && description ? (
        <FieldDescription id={helpId}>{description}</FieldDescription>
      ) : null}
      {issue ? (
        <p role="alert" className="text-sm text-destructive">
          {issue.message}
        </p>
      ) : null}
    </Field>
  );
}
