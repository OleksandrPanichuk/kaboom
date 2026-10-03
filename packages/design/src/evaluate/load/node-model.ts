import type { EdgeKind } from "../../catalogue";
import type { DesignNode } from "../../graph";

export interface Channels {
  reads: number;
  writes: number;
}

export interface Capacity {
  reads: number;
  writes: number;
  shared: boolean;
}

export interface NodeConditions {
  capacityFactor: number;
  replicas: number;
  upReplicas: number;
  hitRatio: number;
}

export const SATURATION = 0.95;

const shared = (value: number): Capacity => ({
  reads: value,
  writes: value,
  shared: true,
});

const separate = (reads: number, writes: number): Capacity => ({
  reads,
  writes,
  shared: false,
});

export const capacityOf = (
  node: DesignNode,
  { capacityFactor, replicas, upReplicas }: NodeConditions,
): Capacity => {
  const scale = (capacity: Capacity): Capacity => ({
    ...capacity,
    reads: capacity.reads * capacityFactor,
    writes: capacity.writes * capacityFactor,
  });

  switch (node.kind) {
    case "client":
    case "scheduler":
    case "coordination":
    case "dns":
    case "k8s-service":
    case "hpa":
    case "config-map":
    case "secret":
    case "alert":
      return shared(Number.POSITIVE_INFINITY);
    case "search-index":
      return scale(
        separate(
          node.props.shards *
            node.props.replicas *
            node.props.queryCapacityPerCopy,
          node.props.shards * node.props.indexCapacityPerShard,
        ),
      );
    case "service":
    case "k8s-deployment":
      return scale(shared(replicas * node.props.capacityRpsPerReplica));
    case "worker":
      return scale(shared(replicas * node.props.capacityMsgPerReplica));
    case "load-balancer":
    case "cdn":
    case "api-gateway":
    case "rate-limiter":
    case "ingress":
      return scale(shared(node.props.capacityRps));
    case "external-api":
      return shared(Number.POSITIVE_INFINITY);
    case "cache":
      return scale(
        separate(node.props.readCapacityRps, node.props.writeCapacityRps),
      );
    case "sql-database":
      return scale(
        separate(
          node.props.readCapacityRps * node.props.shards * (1 + upReplicas),
          node.props.writeCapacityRps * node.props.shards,
        ),
      );
    case "nosql-database":
      return scale(
        separate(
          node.props.partitions * node.props.readCapacityPerPartition,
          node.props.partitions * node.props.writeCapacityPerPartition,
        ),
      );
    case "object-storage":
      return scale(
        separate(node.props.readCapacityRps, node.props.writeCapacityRps),
      );
    case "queue":
    case "stream":
      return scale(shared(node.props.capacityMsgPerSecond));
  }
};

export const throttleLimitOf = (
  node: DesignNode,
  capacityFactor: number,
): number | null => {
  switch (node.kind) {
    case "api-gateway":
      return node.props.throttle.enabled ? node.props.throttle.limitRps : null;
    case "rate-limiter":
      return node.props.limitRps;
    case "external-api":
      return node.props.rateLimitRps * capacityFactor;
    default:
      return null;
  }
};

export const intrinsicErrorRateOf = (node: DesignNode): number =>
  node.kind === "external-api" ? node.props.errorRate : 0;

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

export const baseLatencyOf = (node: DesignNode): number => {
  switch (node.kind) {
    case "client":
    case "scheduler":
    case "dns":
    case "queue":
    case "stream":
    case "k8s-service":
    case "hpa":
    case "config-map":
    case "secret":
    case "alert":
      return 0;
    case "worker":
      return node.props.processingMs;
    default:
      return node.props.baseLatencyMs;
  }
};

export const forwardedBy = (
  node: DesignNode,
  served: Channels,
  hitRatio: number,
): Channels => {
  switch (node.kind) {
    case "cache":
    case "cdn":
      return { reads: served.reads * (1 - hitRatio), writes: served.writes };
    case "sql-database":
    case "nosql-database":
      return { reads: 0, writes: served.writes };
    case "object-storage":
    case "external-api":
    case "search-index":
    case "coordination":
      return { reads: 0, writes: 0 };
    default:
      return served;
  }
};

export const carries = (
  kind: EdgeKind,
): { reads: boolean; writes: boolean } => {
  switch (kind) {
    case "read":
      return { reads: true, writes: false };
    case "write":
      return { reads: false, writes: true };
    case "change-feed":
      return { reads: false, writes: true };
    case "replication":
    case "lock":
    case "mounts":
    case "scales":
    case "watches":
      return { reads: false, writes: false };
    default:
      return { reads: true, writes: true };
  }
};

export const feedsOnlyChanges = (node: DesignNode): boolean =>
  node.kind === "sql-database" || node.kind === "nosql-database";

export const SYNCHRONOUS = new Set<EdgeKind>(["sync-call", "read", "write"]);
