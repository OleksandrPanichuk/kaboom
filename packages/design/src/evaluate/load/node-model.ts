import type { EdgeKind } from "../../catalogue";
import type { DesignNode } from "../../graph";
import {
  behaviourOf,
  type Capacity,
  type Channels,
  type NodeConditions,
} from "./behaviours";

export type { Capacity, Channels, NodeConditions } from "./behaviours";

export const SATURATION = 0.95;

export const capacityOf = (
  node: DesignNode,
  conditions: NodeConditions,
): Capacity => {
  const raw = behaviourOf(node).capacity(node, conditions);
  const scale = (value: number) =>
    Number.isFinite(value) ? value * conditions.capacityFactor : value;

  return { ...raw, reads: scale(raw.reads), writes: scale(raw.writes) };
};

export const connectionLimitOf = (node: DesignNode): number | null =>
  behaviourOf(node).connectionLimit?.(node) ?? null;

export const isReplicated = (node: DesignNode): boolean =>
  behaviourOf(node).replicated === true;

export const holdsPools = isReplicated;

export const throttleLimitOf = (
  node: DesignNode,
  capacityFactor: number,
): number | null =>
  behaviourOf(node).throttleLimit?.(node, capacityFactor) ?? null;

export const intrinsicErrorRateOf = (node: DesignNode): number =>
  behaviourOf(node).intrinsicErrorRate?.(node) ?? 0;

export const utilisation = (load: Channels, capacity: Capacity): number => {
  if (capacity.shared) {
    const total = load.reads + load.writes;

    if (total === 0) return 0;

    return capacity.reads === 0
      ? Number.POSITIVE_INFINITY
      : total / capacity.reads;
  }

  const part = (value: number, limit: number) =>
    value === 0 ? 0 : limit === 0 ? Number.POSITIVE_INFINITY : value / limit;

  return Math.max(
    part(load.reads, capacity.reads),
    part(load.writes, capacity.writes),
  );
};

export const consumerLimit = (capacity: Capacity): number =>
  SATURATION *
  (capacity.shared
    ? capacity.reads
    : Math.max(capacity.reads, capacity.writes));

export const baseLatencyOf = (node: DesignNode): number =>
  behaviourOf(node).baseLatency(node);

export const forwardedBy = (
  node: DesignNode,
  served: Channels,
  hitRatio: number,
): Channels => behaviourOf(node).forwards?.(served, hitRatio) ?? served;

const NOTHING = { reads: false, writes: false } as const;
const BOTH = { reads: true, writes: true } as const;
const WRITES = { reads: false, writes: true } as const;

const CARRIED: Readonly<
  Record<EdgeKind, { readonly reads: boolean; readonly writes: boolean }>
> = {
  "sync-call": BOTH,
  "async-message": BOTH,
  read: { reads: true, writes: false },
  write: WRITES,
  "change-feed": WRITES,
  replication: NOTHING,
  lock: NOTHING,
  mounts: NOTHING,
  scales: NOTHING,
  watches: NOTHING,
  scrapes: NOTHING,
  "pipeline-next": NOTHING,
  publishes: NOTHING,
  protects: NOTHING,
  admits: NOTHING,
  relation: NOTHING,
  reference: NOTHING,
};

export const carries = (
  kind: EdgeKind,
): { readonly reads: boolean; readonly writes: boolean } => CARRIED[kind];

export const feedsOnlyChanges = (node: DesignNode): boolean =>
  behaviourOf(node).feedsOnlyChanges === true;

export const SYNCHRONOUS = new Set<EdgeKind>(["sync-call", "read", "write"]);
