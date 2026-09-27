import type { DesignNode } from "../../graph";
import type { Fault } from "../scenario";

const FAILOVER_SECONDS = { automatic: 30, manual: 300 } as const;
const FLUSH_RECOVERY_SECONDS = 60;

const active = (fault: Fault, t: number): boolean =>
  fault.at <= t &&
  (!("until" in fault) || fault.until === undefined || t < fault.until);

export interface FaultState {
  down: boolean;
  promoted: boolean;
  capacityFactor: number;
  addLatencyMs: number;
  hitRatio: number | null;
}

export const faultStateAt = (
  node: DesignNode,
  faults: readonly Fault[],
  replicaCount: number,
  t: number,
): FaultState => {
  const mine = faults.filter((fault) => fault.nodeId === node.id);
  let down = false;
  let promoted = false;

  for (const fault of mine) {
    if (fault.kind !== "node-down" || !active(fault, t)) continue;

    const failover =
      node.kind === "sql-database" &&
      replicaCount > 0 &&
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
    hitRatio,
  };
};
