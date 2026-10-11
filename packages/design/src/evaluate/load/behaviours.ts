import { DEFAULT_MAX_CONNECTIONS, type NodeKind } from "../../catalogue";
import type { DesignNode, NodeFor } from "../../graph";

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
  connectionThroughput: number;
}

export interface LoadBehaviour<Node extends DesignNode> {
  capacity: (node: Node, conditions: NodeConditions) => Capacity;
  baseLatency: (node: Node) => number;
  forwards?: (served: Channels, hitRatio: number) => Channels;
  throttleLimit?: (node: Node, capacityFactor: number) => number | null;
  intrinsicErrorRate?: (node: Node) => number;
  connectionLimit?: (node: Node) => number;
  replicated?: true;
  feedsOnlyChanges?: true;
}

type LoadBehaviours = {
  readonly [Kind in NodeKind]: LoadBehaviour<NodeFor<Kind>>;
};

export const shared = (value: number): Capacity => ({
  reads: value,
  writes: value,
  shared: true,
});

const separate = (reads: number, writes: number): Capacity => ({
  reads,
  writes,
  shared: false,
});

const unbounded = () => shared(Number.POSITIVE_INFINITY);

const none = (): Channels => ({ reads: 0, writes: 0 });

const missesAndWrites = (served: Channels, hitRatio: number): Channels => ({
  reads: served.reads * (1 - hitRatio),
  writes: served.writes,
});

const writesOnly = (served: Channels): Channels => ({
  reads: 0,
  writes: served.writes,
});

const idle = { capacity: unbounded, baseLatency: () => 0 } as const;

const ownLatency = (node: { props: { baseLatencyMs: number } }) =>
  node.props.baseLatencyMs;

const fixed = (node: { props: { capacityRps: number } }) =>
  shared(node.props.capacityRps);

export const LOAD_BEHAVIOURS: LoadBehaviours = {
  client: idle,
  dns: idle,
  scheduler: { ...idle, replicated: true },
  "k8s-service": idle,
  hpa: idle,
  "config-map": idle,
  secret: idle,
  alert: idle,
  monitoring: idle,
  "pipeline-stage": idle,
  "artifact-registry": idle,
  "security-group": idle,
  "nat-gateway": idle,
  table: idle,
  collection: idle,
  "dynamo-table": idle,
  queue: {
    capacity: (node) => shared(node.props.capacityMsgPerSecond),
    baseLatency: () => 0,
  },
  stream: {
    capacity: (node) => shared(node.props.capacityMsgPerSecond),
    baseLatency: () => 0,
  },
  coordination: {
    capacity: unbounded,
    baseLatency: ownLatency,
    forwards: none,
  },
  "external-api": {
    capacity: unbounded,
    baseLatency: ownLatency,
    forwards: none,
    throttleLimit: (node, capacityFactor) =>
      node.props.rateLimitRps * capacityFactor,
    intrinsicErrorRate: (node) => node.props.errorRate,
  },
  service: {
    capacity: (node, { replicas }) =>
      shared(replicas * node.props.capacityRpsPerReplica),
    baseLatency: ownLatency,
    replicated: true,
  },
  "k8s-deployment": {
    capacity: (node, { replicas }) =>
      shared(replicas * node.props.capacityRpsPerReplica),
    baseLatency: ownLatency,
    replicated: true,
  },
  worker: {
    capacity: (node, { replicas }) =>
      shared(replicas * node.props.capacityMsgPerReplica),
    baseLatency: (node) => node.props.processingMs,
    replicated: true,
  },
  "load-balancer": { capacity: fixed, baseLatency: ownLatency },
  ingress: { capacity: fixed, baseLatency: ownLatency },
  cdn: { capacity: fixed, baseLatency: ownLatency, forwards: missesAndWrites },
  "api-gateway": {
    capacity: fixed,
    baseLatency: ownLatency,
    throttleLimit: (node) =>
      node.props.throttle.enabled ? node.props.throttle.limitRps : null,
  },
  "rate-limiter": {
    capacity: fixed,
    baseLatency: ownLatency,
    throttleLimit: (node) => node.props.limitRps,
  },
  cache: {
    capacity: (node) =>
      separate(node.props.readCapacityRps, node.props.writeCapacityRps),
    baseLatency: ownLatency,
    forwards: missesAndWrites,
  },
  "connection-pooler": {
    capacity: (node, { connectionThroughput }) =>
      shared(Math.min(node.props.capacityRps, connectionThroughput)),
    baseLatency: ownLatency,
    connectionLimit: (node) => node.props.maxClientConnections,
  },
  "sql-database": {
    capacity: (node, { upReplicas }) =>
      separate(
        node.props.readCapacityRps * node.props.shards * (1 + upReplicas),
        node.props.writeCapacityRps * node.props.shards,
      ),
    baseLatency: ownLatency,
    forwards: writesOnly,
    connectionLimit: (node) =>
      node.props.maxConnections ?? DEFAULT_MAX_CONNECTIONS,
    feedsOnlyChanges: true,
  },
  "nosql-database": {
    capacity: (node) =>
      separate(
        node.props.partitions * node.props.readCapacityPerPartition,
        node.props.partitions * node.props.writeCapacityPerPartition,
      ),
    baseLatency: ownLatency,
    forwards: writesOnly,
    feedsOnlyChanges: true,
  },
  "object-storage": {
    capacity: (node) =>
      separate(node.props.readCapacityRps, node.props.writeCapacityRps),
    baseLatency: ownLatency,
    forwards: none,
  },
  "search-index": {
    capacity: (node) =>
      separate(
        node.props.shards *
          node.props.replicas *
          node.props.queryCapacityPerCopy,
        node.props.shards * node.props.indexCapacityPerShard,
      ),
    baseLatency: ownLatency,
    forwards: none,
  },
};

export const behaviourOf = (node: DesignNode): LoadBehaviour<DesignNode> =>
  LOAD_BEHAVIOURS[node.kind] as unknown as LoadBehaviour<DesignNode>;
