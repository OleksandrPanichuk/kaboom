import {
  carriesLoad,
  DEFAULT_POOL_SIZE,
  describeProps,
  type DesignEdge,
  type DesignOp,
  EDGE_KINDS,
  type EdgePatch,
  EdgePropsSchema,
  MAX_POOL_SIZE,
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
import type { RelationColumns } from "@/features/properties/utils";

import { DraftInput } from "./DraftInput";
import { InspectorSection } from "./InspectorSection";
import { type CommitResult, PropFieldControl } from "./PropFieldControl";
import { RelationSection } from "./RelationSection";

const LABEL_MAX_LENGTH = 80;

const EDGE_FIELDS = describeProps(EdgePropsSchema);

interface EdgeInspectorProps {
  edge: DesignEdge;
  fromLabel: string;
  toLabel: string;
  columns?: RelationColumns | null;
  referenceName?: string | null;
  pooled?: boolean;
  onApply?: (ops: DesignOp[]) => CommitResult;
  onPatch: (patch: EdgePatch) => CommitResult;
  onDelete: () => void;
}

export function EdgeInspector({
  edge,
  fromLabel,
  toLabel,
  columns = null,
  referenceName = null,
  pooled = false,
  onApply = () => null,
  onPatch,
  onDelete,
}: EdgeInspectorProps) {
  const id = useId();
  const [kindError, setKindError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);
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

      {edge.relation && columns ? (
        <RelationSection
          edge={edge}
          columns={columns}
          fromLabel={fromLabel}
          toLabel={toLabel}
          onPatch={onPatch}
          onApply={onApply}
        />
      ) : null}

      {edge.reference ? (
        <InspectorSection title="Reference">
          <p className="font-mono text-sm break-all">
            {fromLabel}.{referenceName ?? edge.reference.fromField.join(".")} →{" "}
            {toLabel}._id
          </p>
          <p className="-mt-2 text-xs leading-5 text-muted-foreground text-pretty">
            Each {fromLabel} document holds the _id of a {toLabel} document.
            Nothing checks that it exists: MongoDB enforces no foreign keys.
          </p>
        </InspectorSection>
      ) : null}

      <InspectorSection title="General">
        {edge.kind === "relation" || edge.kind === "reference" ? null : (
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
        )}
        <Field data-invalid={labelError ? true : undefined}>
          <FieldLabel htmlFor={`${id}-label`}>Label</FieldLabel>
          <DraftInput
            id={`${id}-label`}
            value={edge.label}
            maxLength={LABEL_MAX_LENGTH}
            placeholder={
              edge.kind === "relation"
                ? "What the reference means"
                : "What travels along it"
            }
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
          {pooled ? (
            <Field data-invalid={poolError ? true : undefined}>
              <FieldLabel htmlFor={`${id}-pool`}>Connection pool</FieldLabel>
              <DraftInput
                id={`${id}-pool`}
                value={String(edge.connection?.poolSize ?? "")}
                inputMode="numeric"
                placeholder={String(DEFAULT_POOL_SIZE)}
                invalid={poolError !== null}
                describedBy={`${id}-pool-description`}
                onUnchanged={() => setPoolError(null)}
                onCommit={(text) => {
                  const trimmed = text.trim();
                  const size = Number(trimmed);

                  if (trimmed === "") {
                    setPoolError(onPatch({ connection: null }));
                  } else if (
                    !Number.isInteger(size) ||
                    size < 1 ||
                    size > MAX_POOL_SIZE
                  ) {
                    setPoolError(
                      `Use a whole number from 1 to ${MAX_POOL_SIZE.toLocaleString("en")}.`,
                    );
                  } else {
                    setPoolError(onPatch({ connection: { poolSize: size } }));
                  }
                }}
              />
              <FieldDescription
                id={`${id}-pool-description`}
                className="text-xs"
              >
                Connections each replica of {fromLabel} keeps open to {toLabel}.
                Empty means {DEFAULT_POOL_SIZE}.
              </FieldDescription>
              {poolError ? <FieldError>{poolError}</FieldError> : null}
            </Field>
          ) : null}
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
