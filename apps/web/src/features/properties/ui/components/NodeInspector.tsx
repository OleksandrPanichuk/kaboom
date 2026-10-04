import {
  catalogue,
  derivedProps,
  describeProps,
  type DesignGroup,
  type DesignNode,
  findTechnology,
  type LintHit,
  type NodeCost,
  type NodePatch,
} from "@repo/design";
import { ChevronRight, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { FALLBACK_NODE_ICON, NODE_KIND_ICONS } from "@/features/canvas";
import type {
  PlacementFields,
  RegionTarget,
} from "@/features/properties/typedefs";
import { formatMonthly } from "@/features/properties/utils";

import { DerivedField } from "./DerivedField";
import { DraftInput } from "./DraftInput";
import { InspectorSection } from "./InspectorSection";
import { KindAbout } from "./KindAbout";
import { LintCallout } from "./LintCallout";
import { type CommitResult, PropFieldControl } from "./PropFieldControl";
import { RegionField } from "./RegionField";
import { SubnetField } from "./SubnetField";
import { TechnologySection } from "./TechnologySection";

const LABEL_MAX_LENGTH = 80;
const NOTES_MAX_LENGTH = 2_000;

interface NodeInspectorProps {
  node: DesignNode;
  cost?: NodeCost | null;
  hits: LintHit[];
  replicas?: string[];
  groups: DesignGroup[];
  placement: PlacementFields;
  onRegionChange: (target: RegionTarget) => void;
  onPatch: (patch: NodePatch) => CommitResult;
  onDelete: () => void;
}

export function NodeInspector({
  node,
  cost = null,
  hits,
  replicas = [],
  groups,
  placement,
  onRegionChange,
  onPatch,
  onDelete,
}: NodeInspectorProps) {
  const id = useId();
  const [labelError, setLabelError] = useState<string | null>(null);
  const [notes, setNotes] = useState(node.notes);
  const [notesSource, setNotesSource] = useState(node.notes);
  const definition = catalogue[node.kind];
  const Icon = NODE_KIND_ICONS[definition.icon] ?? FALLBACK_NODE_ICON;
  const fields = describeProps(definition.props);
  const basic = fields.filter((field) => !field.meta.advanced);
  const advanced = fields.filter((field) => field.meta.advanced);
  const props = node.props as Record<string, unknown>;
  const derived = new Set(
    Object.keys(derivedProps(node.kind, node.technology)),
  );
  const product = node.technology
    ? findTechnology(node.technology.id, node.kind)
    : undefined;
  const control = (field: (typeof fields)[number]) =>
    derived.has(field.key) && product ? (
      <DerivedField
        key={field.key}
        field={field}
        value={props[field.key]}
        source={product.label}
      />
    ) : (
      <PropFieldControl
        key={field.key}
        field={field}
        value={props[field.key]}
        onCommit={setProp(field.key)}
      />
    );

  if (notesSource !== node.notes) {
    setNotesSource(node.notes);
    setNotes(node.notes);
  }

  const setProp = (key: string) => (value: unknown) =>
    onPatch({ props: { [key]: value } });

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-indigo-200/60 bg-indigo-50 text-indigo-700">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold">
            {node.label || definition.label}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {product
              ? `${definition.label} · ${product.label}`
              : definition.label}
          </p>
        </div>
      </div>

      {node.kind === "sql-database" && replicas.length > 0 ? (
        <p className="border-b px-4 py-3 text-sm leading-5 text-muted-foreground">
          Writes go to{" "}
          <span className="font-medium text-foreground">
            {node.label || definition.label}
          </span>{" "}
          only. Reads are spread over it and{" "}
          <span className="font-medium text-foreground">
            {replicas.length === 1
              ? replicas[0]
              : `${replicas.length} replicas`}
          </span>
          .
        </p>
      ) : null}

      {hits.length > 0 ? (
        <div className="flex flex-col gap-2 border-b p-4">
          {hits.map((hit) => (
            <LintCallout key={`${hit.lint}-${hit.message}`} hit={hit} />
          ))}
        </div>
      ) : null}

      <KindAbout
        kind={node.kind}
        label={definition.label}
        docs={definition.docs}
      />

      <InspectorSection title="General">
        <Field data-invalid={labelError ? true : undefined}>
          <FieldLabel htmlFor={`${id}-label`}>Name</FieldLabel>
          <DraftInput
            id={`${id}-label`}
            value={node.label}
            maxLength={LABEL_MAX_LENGTH}
            placeholder={definition.label}
            invalid={labelError !== null}
            onUnchanged={() => setLabelError(null)}
            onCommit={(text) => setLabelError(onPatch({ label: text.trim() }))}
          />
          {labelError ? <FieldError>{labelError}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-notes`}>Notes</FieldLabel>
          <Textarea
            id={`${id}-notes`}
            value={notes}
            maxLength={NOTES_MAX_LENGTH}
            rows={3}
            placeholder="Why it is here, what it stores"
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => {
              if (notes !== node.notes) onPatch({ notes });
            }}
          />
        </Field>
        {cost && cost.monthlyUsd > 0 ? (
          <div className="flex flex-col gap-0.5">
            <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">Estimated cost</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {formatMonthly(cost.monthlyUsd)} a month
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-pretty">
              {cost.basis}, at the clients' steady traffic
            </p>
          </div>
        ) : null}
        {placement.regions ? (
          <RegionField
            regions={groups.filter((group) => group.kind === "region")}
            value={node.groupId}
            onChange={onRegionChange}
          />
        ) : null}
        {placement.subnets ? (
          <SubnetField
            groups={groups}
            value={node.groupId}
            onChange={onRegionChange}
          />
        ) : null}
      </InspectorSection>

      <TechnologySection node={node} onPatch={onPatch} />

      <InspectorSection title="Properties">
        {product ? (
          <p className="-mt-1 text-xs leading-5 text-muted-foreground">
            Values on the right are set by {product.label}; change them through
            its settings above.
          </p>
        ) : null}
        {basic.map(control)}
      </InspectorSection>

      {advanced.length > 0 ? (
        <details className="group border-b">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-open:rotate-90"
            />
            Advanced
          </summary>
          <div className="flex flex-col gap-4 px-4 pb-4">
            {advanced.map(control)}
          </div>
        </details>
      ) : null}

      <div className="px-4 py-4">
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
          Delete node
        </Button>
      </div>
    </div>
  );
}
