import type { DesignNode } from "../../graph";
import type { Fault } from "../scenario";

const FAILOVER_SECONDS = { automatic: 30, manual: 300 } as const;
const FLUSH_RECOVERY_SECONDS = 60;

export const active = (fault: Fault, t: number): boolean =>
  fault.at <= t &&
  (!("until" in fault) || fault.until === undefined || t < fault.until);

export interface FaultState {
  down: boolean;
  promoted: boolean;
  capacityFactor: number;
  addLatencyMs: number;
  errorRate: number;
  hitRatio: number | null;
}

export interface Placement {
  groups: readonly string[];
  replicaGroups: ReadonlyArray<readonly string[]>;
}

const regionDownAt = (
  faults: readonly Fault[],
  groups: readonly string[],
  t: number,
) =>
  faults.find(
    (fault) =>
      (fault.kind === "region-down" || fault.kind === "group-down") &&
      groups.includes(fault.groupId) &&
      active(fault, t),
  );

export const faultStateAt = (
  node: DesignNode,
  faults: readonly Fault[],
  placement: Placement,
  t: number,
): FaultState => {
  const mine = faults.filter(
    (fault) => "nodeId" in fault && fault.nodeId === node.id,
  );
  const outage = [
    ...mine.filter((fault) => fault.kind === "node-down"),
    ...(regionDownAt(faults, placement.groups, t)
      ? [regionDownAt(faults, placement.groups, t)!]
      : []),
  ];
  const survivors = placement.replicaGroups.filter(
    (groups) => !regionDownAt(faults, groups, t),
  ).length;
  let down = false;
  let promoted = false;

  for (const fault of outage) {
    if (!active(fault, t)) continue;

    const failover =
      node.kind === "sql-database" &&
      survivors > 0 &&
      node.props.failover !== "none"
        ? FAILOVER_SECONDS[node.props.failover]
        : null;

    if (failover !== null && t >= fault.at + failover) promoted = true;
    else down = true;
  }

  const capacityFactor = mine
    .filter((fault) => fault.kind === "capacity" && active(fault, t))
    .reduce(
      (product, fault) =>
        product * (fault.kind === "capacity" ? fault.factor : 1),
      1,
    );

  const addLatencyMs = mine
    .filter((fault) => fault.kind === "latency" && active(fault, t))
    .reduce(
      (sum, fault) => sum + (fault.kind === "latency" ? fault.addMs : 0),
      0,
    );

  const errorRate =
    1 -
    mine
      .filter((fault) => fault.kind === "error-rate" && active(fault, t))
      .reduce(
        (survive, fault) =>
          survive * (1 - (fault.kind === "error-rate" ? fault.rate : 0)),
        1,
      );

  let hitRatio: number | null = null;

  if (node.kind === "cache" || node.kind === "cdn") {
    hitRatio = node.props.hitRatio;

    for (const fault of mine) {
      if (fault.kind !== "cache-flush" || t < fault.at) continue;

      const elapsed = t - fault.at;
      const recovered = Math.min(1, elapsed / FLUSH_RECOVERY_SECONDS);

      hitRatio = Math.min(hitRatio, node.props.hitRatio * recovered);
    }
  }

  return {
    down,
    promoted: promoted && !down,
    capacityFactor,
    addLatencyMs,
    errorRate,
    hitRatio,
  };
};
