import { catalogue, type DesignGraph } from "@repo/design";
import { Plus, X } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldLabel } from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import {
  FAULT_KINDS,
  FLUSHABLE_KINDS,
  GROUP_FAULT_KINDS,
  RELEASES,
  ROLLABLE_KINDS,
} from "@/features/simulation/constants";
import type {
  FaultDraft,
  FaultKind,
  ScenarioDraft,
} from "@/features/simulation/typedefs";

import { NumberField } from "./NumberField";

interface FaultListProps {
  graph: DesignGraph;
  draft: ScenarioDraft;
  onChange: (draft: ScenarioDraft) => void;
}

interface FaultTarget {
  id: string;
  label: string;
}

const targetsFor = (graph: DesignGraph, kind: FaultKind): FaultTarget[] =>
  GROUP_FAULT_KINDS.has(kind)
    ? graph.groups
        .filter((group) => kind !== "region-down" || group.kind === "region")
        .map((group) => ({ id: group.id, label: group.label || group.kind }))
    : graph.nodes
        .filter((node) =>
          kind === "secret-rotation"
            ? node.kind === "secret"
            : node.kind !== "client" &&
              catalogue[node.kind].carriesTraffic &&
              (kind !== "cache-flush" || FLUSHABLE_KINDS.has(node.kind)) &&
              (kind !== "rollout" || ROLLABLE_KINDS.has(node.kind)),
        )
        .map((node) => ({
          id: node.id,
          label: node.label || catalogue[node.kind].label,
        }));

export function FaultList({ graph, draft, onChange }: FaultListProps) {
  const update = (key: string, patch: Partial<FaultDraft>) =>
    onChange({
      ...draft,
      faults: draft.faults.map((fault) =>
        fault.key === key ? { ...fault, ...patch } : fault,
      ),
    });

  const addFault = () => {
    const [first] = targetsFor(graph, "node-down");

    if (!first) return;

    onChange({
      ...draft,
      faults: [
        ...draft.faults,
        {
          key: crypto.randomUUID(),
          kind: "node-down",
          targetId: first.id,
          at: 120,
          until: null,
          factor: 0.5,
          addMs: 200,
          rate: 0.2,
          release: "never-ready",
          migrates: false,
        },
      ],
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {draft.faults.map((fault) => (
        <FaultRow
          key={fault.key}
          graph={graph}
          fault={fault}
          maxSeconds={draft.durationSeconds}
          onChange={(patch) => update(fault.key, patch)}
          onRemove={() =>
            onChange({
              ...draft,
              faults: draft.faults.filter((item) => item.key !== fault.key),
            })
          }
        />
      ))}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={targetsFor(graph, "node-down").length === 0}
        onClick={addFault}
      >
        <Plus aria-hidden="true" />
        Add a fault
      </Button>
    </div>
  );
}

interface FaultRowProps {
  graph: DesignGraph;
  fault: FaultDraft;
  maxSeconds: number;
  onChange: (patch: Partial<FaultDraft>) => void;
  onRemove: () => void;
}

function FaultRow({
  graph,
  fault,
  maxSeconds,
  onChange,
  onRemove,
}: FaultRowProps) {
  const id = useId();
  const candidates = targetsFor(graph, fault.kind);
  const missing = !candidates.some((target) => target.id === fault.targetId);
  const kind = FAULT_KINDS.find((item) => item.kind === fault.kind)!;
  const kinds = FAULT_KINDS.filter(
    (item) =>
      item.kind === fault.kind || targetsFor(graph, item.kind).length > 0,
  );
  const noun =
    fault.kind === "region-down"
      ? "Region"
      : GROUP_FAULT_KINDS.has(fault.kind)
        ? "Group"
        : "Node";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/[0.07] p-3">
      <div className="flex items-start gap-2">
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor={`${id}-kind`} className="text-xs">
            Fault
          </FieldLabel>
          <Select
            value={fault.kind}
            onValueChange={(value) => {
              const next = value!;
              const allowed = targetsFor(graph, next);

              onChange({
                kind: next,
                targetId: allowed.some((target) => target.id === fault.targetId)
                  ? fault.targetId
                  : (allowed[0]?.id ?? fault.targetId),
              });
            }}
            items={kinds.map((item) => ({
              value: item.kind,
              label: item.label,
            }))}
          >
            <SelectTrigger id={`${id}-kind`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kinds.map((item) => (
                <SelectItem key={item.kind} value={item.kind}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button
          variant="ghost"
          size="icon-sm"
          className="mt-5 shrink-0"
          aria-label={`Remove ${kind.label.toLowerCase()}`}
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <p className="-mt-1 text-xs leading-5 text-muted-foreground">
        {kind.description}
      </p>
      <Field>
        <FieldLabel htmlFor={`${id}-node`} className="text-xs">
          {noun}
        </FieldLabel>
        <Select
          value={fault.targetId}
          onValueChange={(value) => onChange({ targetId: String(value) })}
          items={candidates.map((target) => ({
            value: target.id,
            label: target.label,
          }))}
        >
          <SelectTrigger id={`${id}-node`} className="w-full">
            <SelectValue placeholder={`Pick a ${noun.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((target) => (
              <SelectItem key={target.id} value={target.id}>
                {target.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {missing ? (
          <p className="text-xs text-amber-700">
            That {noun.toLowerCase()} is no longer in the design, so this fault
            is skipped.
          </p>
        ) : null}
      </Field>
      {fault.kind === "rollout" ? (
        <Field>
          <FieldLabel htmlFor={`${id}-release`} className="text-xs">
            Version
          </FieldLabel>
          <Select
            value={fault.release}
            onValueChange={(value) => onChange({ release: value! })}
            items={RELEASES.map((item) => ({
              value: item.release,
              label: item.label,
            }))}
          >
            <SelectTrigger id={`${id}-release`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELEASES.map((item) => (
                <SelectItem key={item.release} value={item.release}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {fault.kind === "rollout" ? (
        <Field orientation="horizontal">
          <Switch
            id={`${id}-migrates`}
            checked={fault.migrates}
            onCheckedChange={(migrates) => onChange({ migrates })}
          />
          <FieldLabel htmlFor={`${id}-migrates`} className="text-xs">
            Runs a schema migration first
          </FieldLabel>
        </Field>
      ) : null}
      <div className="flex gap-2">
        <NumberField
          label="From"
          value={fault.at}
          suffix="s"
          min={0}
          max={maxSeconds}
          integer
          onChange={(at) => onChange({ at })}
        />
        {fault.kind !== "cache-flush" &&
        fault.kind !== "rollout" &&
        fault.kind !== "secret-rotation" ? (
          <NumberField
            label="Until"
            value={fault.until ?? maxSeconds}
            suffix="s"
            min={0}
            max={maxSeconds}
            integer
            onChange={(until) =>
              onChange({ until: until >= maxSeconds ? null : until })
            }
          />
        ) : null}
        {fault.kind === "capacity" ? (
          <NumberField
            label="Left"
            value={fault.factor}
            suffix="%"
            min={0}
            max={1}
            scale={100}
            onChange={(factor) => onChange({ factor })}
          />
        ) : null}
        {fault.kind === "error-rate" ? (
          <NumberField
            label="Fails"
            value={fault.rate}
            suffix="%"
            min={0}
            max={1}
            scale={100}
            onChange={(rate) => onChange({ rate })}
          />
        ) : null}
        {fault.kind === "latency" ? (
          <NumberField
            label="Adds"
            value={fault.addMs}
            suffix="ms"
            min={0}
            max={600_000}
            onChange={(addMs) => onChange({ addMs })}
          />
        ) : null}
      </div>
    </div>
  );
}
