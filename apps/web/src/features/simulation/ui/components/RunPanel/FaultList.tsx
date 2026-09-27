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
import { FAULT_KINDS, FLUSHABLE_KINDS } from "@/features/simulation/constants";
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

const nodesFor = (graph: DesignGraph, kind: FaultKind) =>
  graph.nodes.filter(
    (node) =>
      node.kind !== "client" &&
      (kind !== "cache-flush" || FLUSHABLE_KINDS.has(node.kind)),
  );

export function FaultList({ graph, draft, onChange }: FaultListProps) {
  const update = (key: string, patch: Partial<FaultDraft>) =>
    onChange({
      ...draft,
      faults: draft.faults.map((fault) =>
        fault.key === key ? { ...fault, ...patch } : fault,
      ),
    });

  const addFault = () => {
    const [first] = nodesFor(graph, "node-down");

    if (!first) return;

    onChange({
      ...draft,
      faults: [
        ...draft.faults,
        {
          key: crypto.randomUUID(),
          kind: "node-down",
          nodeId: first.id,
          at: 120,
          until: null,
          factor: 0.5,
          addMs: 200,
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
        disabled={nodesFor(graph, "node-down").length === 0}
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
  const candidates = nodesFor(graph, fault.kind);
  const missing = !graph.nodes.some((node) => node.id === fault.nodeId);
  const kind = FAULT_KINDS.find((item) => item.kind === fault.kind)!;

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
              const allowed = nodesFor(graph, next);

              onChange({
                kind: next,
                nodeId: allowed.some((node) => node.id === fault.nodeId)
                  ? fault.nodeId
                  : (allowed[0]?.id ?? fault.nodeId),
              });
            }}
            items={FAULT_KINDS.map((item) => ({
              value: item.kind,
              label: item.label,
            }))}
          >
            <SelectTrigger id={`${id}-kind`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FAULT_KINDS.map((item) => (
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
          Node
        </FieldLabel>
        <Select
          value={fault.nodeId}
          onValueChange={(value) => onChange({ nodeId: String(value) })}
          items={candidates.map((node) => ({
            value: node.id,
            label: node.label || catalogue[node.kind].label,
          }))}
        >
          <SelectTrigger id={`${id}-node`} className="w-full">
            <SelectValue placeholder="Pick a node" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((node) => (
              <SelectItem key={node.id} value={node.id}>
                {node.label || catalogue[node.kind].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {missing ? (
          <p className="text-xs text-amber-700">
            That node is no longer in the design, so this fault is skipped.
          </p>
        ) : null}
      </Field>
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
        {fault.kind !== "cache-flush" ? (
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
