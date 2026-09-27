import type { DesignGroup } from "@repo/design";
import { MapPin, Ungroup } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";

import { DraftInput } from "./DraftInput";
import { InspectorSection } from "./InspectorSection";

const LABEL_MAX_LENGTH = 80;

interface RegionInspectorProps {
  region: DesignGroup;
  members: string[];
  onRename: (label: string) => string | null;
  onDissolve: () => void;
}

export function RegionInspector({
  region,
  members,
  onRename,
  onDissolve,
}: RegionInspectorProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-sky-200/70 bg-sky-50 text-sky-700">
          <MapPin aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold">
            {region.label || "Region"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Region · {members.length} {members.length === 1 ? "node" : "nodes"}
          </p>
        </div>
      </div>

      <p className="border-b px-4 py-3 text-sm leading-5 text-muted-foreground text-pretty">
        A Region down fault stops every node in it at once. A synchronous call
        from one region to another adds 70 ms.
      </p>

      <InspectorSection title="General">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={`${id}-label`}>Name</FieldLabel>
          <DraftInput
            id={`${id}-label`}
            value={region.label}
            maxLength={LABEL_MAX_LENGTH}
            placeholder="Region"
            invalid={error !== null}
            onUnchanged={() => setError(null)}
            onCommit={(text) => setError(onRename(text.trim()))}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Nodes</p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {members.map((label, index) => (
              <li key={`${label}-${index}`} className="truncate">
                {label}
              </li>
            ))}
          </ul>
        </div>
      </InspectorSection>

      <div className="px-4 py-4">
        <Button variant="outline" className="w-full" onClick={onDissolve}>
          <Ungroup aria-hidden="true" />
          Remove region, keep its nodes
        </Button>
      </div>
    </div>
  );
}
