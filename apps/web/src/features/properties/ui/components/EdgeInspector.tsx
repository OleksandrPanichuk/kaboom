import {
  carriesLoad,
  describeProps,
  type DesignEdge,
  EDGE_KINDS,
  type EdgePatch,
  EdgePropsSchema,
} from "@repo/design";
import { ArrowRight, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { EDGE_KIND_STYLES } from "@/features/canvas";

import { DraftInput } from "./DraftInput";
import { InspectorSection } from "./InspectorSection";
import { type CommitResult, PropFieldControl } from "./PropFieldControl";

const LABEL_MAX_LENGTH = 80;

const EDGE_FIELDS = describeProps(EdgePropsSchema);

interface EdgeInspectorProps {
  edge: DesignEdge;
  fromLabel: string;
  toLabel: string;
  onPatch: (patch: EdgePatch) => CommitResult;
  onDelete: () => void;
}

export function EdgeInspector({
  edge,
  fromLabel,
  toLabel,
  onPatch,
  onDelete,
}: EdgeInspectorProps) {
  const id = useId();
  const [kindError, setKindError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const kind = EDGE_KIND_STYLES[edge.kind];
  const props = edge.props as Record<string, unknown>;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1 border-b px-4 py-3">
        <p className="text-xs text-muted-foreground">{kind.label}</p>
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <span className="truncate">{fromLabel}</span>
          <ArrowRight
            aria-label="to"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <span className="truncate">{toLabel}</span>
        </p>
      </div>

      <InspectorSection title="General">
        <Field>
          <FieldLabel htmlFor={`${id}-kind`}>Kind</FieldLabel>
          <Select
            value={edge.kind}
            onValueChange={(next) => setKindError(onPatch({ kind: next! }))}
            items={EDGE_KINDS.map((value) => ({
              value,
              label: EDGE_KIND_STYLES[value].label,
            }))}
          >
            <SelectTrigger id={`${id}-kind`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDGE_KINDS.map((value) => (
                <SelectItem key={value} value={value}>
                  {EDGE_KIND_STYLES[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription className="text-xs">
            {kind.description}
          </FieldDescription>
          {kindError ? <FieldError>{kindError}</FieldError> : null}
        </Field>
        <Field data-invalid={labelError ? true : undefined}>
          <FieldLabel htmlFor={`${id}-label`}>Label</FieldLabel>
          <DraftInput
            id={`${id}-label`}
            value={edge.label}
            maxLength={LABEL_MAX_LENGTH}
            placeholder="What travels along it"
            invalid={labelError !== null}
            onUnchanged={() => setLabelError(null)}
            onCommit={(text) => setLabelError(onPatch({ label: text.trim() }))}
          />
          {labelError ? <FieldError>{labelError}</FieldError> : null}
        </Field>
      </InspectorSection>

      {carriesLoad(edge.kind) ? (
        <InspectorSection title="Load">
          {EDGE_FIELDS.map((field) => (
            <PropFieldControl
              key={field.key}
              field={field}
              value={props[field.key]}
              onCommit={(value) => onPatch({ props: { [field.key]: value } })}
            />
          ))}
        </InspectorSection>
      ) : null}

      <div className="px-4 py-4">
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
          Delete edge
        </Button>
      </div>
    </div>
  );
}
