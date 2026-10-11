import { DEFAULT_MAX_CONNECTIONS, type NodeKind } from "../catalogue";
import { findTechnology } from "../catalogue/technologies";
import type { DesignGraph, DesignNode, NodeFor } from "../graph";
import { perMillion, PRICES } from "../pricing";

export interface NodeLoad {
  reads: number;
  writes: number;
  replicas?: number;
}

export interface NodeCost {
  nodeId: string;
  monthlyUsd: number;
  basis: string;
}

export interface CostEstimate {
  monthlyUsd: number;
  nodes: NodeCost[];
}

const IDLE: NodeLoad = { reads: 0, writes: 0 };

const round = (value: number) => Math.round(value * 10) / 10;

const usd = (value: number) => `$${Math.round(value).toLocaleString("en")}`;

interface Charge {
  monthlyUsd: number;
  basis: string;
}

type KindCost<Node extends DesignNode> = (
  node: Node,
  load: NodeLoad,
  graph: DesignGraph,
) => Charge;

type KindCosts = { readonly [Kind in NodeKind]: KindCost<NodeFor<Kind>> };

const free = (): Charge => ({ monthlyUsd: 0, basis: "no charge of its own" });

const flat = (monthlyUsd: number, basis: string) => (): Charge => ({
  monthlyUsd,
  basis,
});

const perRequest =
  (price: number, unit: string) =>
  (_node: DesignNode, load: NodeLoad): Charge => ({
    monthlyUsd: perMillion(load.reads + load.writes, price),
    basis: `${usd(price)} a million ${unit}`,
  });

const replicas = (
  node: { props: { replicas: number } },
  load: NodeLoad,
): Charge => {
  const count = load.replicas ?? node.props.replicas;

  return {
    monthlyUsd: count * PRICES.replica,
    basis: `${round(count)} × ${usd(PRICES.replica)} a replica`,
  };
};

const balancer = (_node: DesignNode, load: NodeLoad): Charge => ({
  monthlyUsd:
    PRICES.balancer +
    ((load.reads + load.writes) / 1_000) * PRICES.balancerPer1000Rps,
  basis: "an hourly charge and capacity units for its traffic",
});

const KIND_COSTS: KindCosts = {
  client: free,
  "external-api": free,
  "k8s-service": free,
  hpa: free,
  "config-map": free,
  alert: free,
  "pipeline-stage": free,
  "artifact-registry": free,
  "security-group": free,
  table: free,
  collection: free,
  "dynamo-table": free,
  service: replicas,
  worker: replicas,
  "k8s-deployment": (node, load, graph) => {
    const scaler = graph.edges.find(
      (edge) => edge.kind === "scales" && edge.to === node.id,
    );
    const hpa = graph.nodes.find((item) => item.id === scaler?.from);
    const pods =
      load.replicas ??
      (hpa?.kind === "hpa"
        ? Math.min(hpa.props.max, Math.max(hpa.props.min, node.props.replicas))
        : node.props.replicas);

    return {
      monthlyUsd: pods * PRICES.pod,
      basis: `${round(pods)} × ${usd(PRICES.pod)} a pod`,
    };
  },
  "sql-database": (node, _load, graph) => {
    const standby =
      node.props.failover === "automatic" &&
      !graph.edges.some(
        (edge) => edge.kind === "replication" && edge.from === node.id,
      );
    const copies = standby ? 2 : 1;
    const instances = node.props.shards * copies;
    const size = Math.max(
      1,
      node.props.readCapacityRps / PRICES.sqlInstanceReadRps,
      node.props.writeCapacityRps / PRICES.sqlInstanceWriteRps,
      (node.props.maxConnections ?? DEFAULT_MAX_CONNECTIONS) /
        PRICES.sqlInstanceConnections,
    );
    const sized = size > 1 ? `, each ${round(size)}× the base size,` : "";

    return {
      monthlyUsd:
        instances * size * PRICES.sqlInstance +
        node.props.storageGb * node.props.shards * PRICES.sqlStoragePerGb,
      basis: `${instances} instance${instances === 1 ? "" : "s"}${sized} and ${node.props.storageGb} GB`,
    };
  },
  "nosql-database": (node) => ({
    monthlyUsd:
      node.props.partitions * PRICES.nosqlPartition +
      node.props.storageGb * PRICES.nosqlStoragePerGb,
    basis: `${node.props.partitions} partitions and ${node.props.storageGb} GB`,
  }),
  cache: (node) => {
    const nodes = Math.max(
      1,
      Math.ceil(node.props.readCapacityRps / PRICES.cacheNodeRps),
    );

    return {
      monthlyUsd: nodes * PRICES.cacheNode,
      basis: `${nodes} node${nodes === 1 ? "" : "s"}`,
    };
  },
  "load-balancer": balancer,
  ingress: balancer,
  "api-gateway": perRequest(PRICES.gatewayPerMillion, "requests"),
  cdn: perRequest(PRICES.cdnPerMillion, "requests"),
  queue: perRequest(PRICES.queuePerMillion, "messages"),
  dns: flat(PRICES.dns, "a hosted zone"),
  stream: (node) => ({
    monthlyUsd: node.props.partitions * PRICES.streamPartition,
    basis: `${node.props.partitions} partitions`,
  }),
  "object-storage": (_node, load) => ({
    monthlyUsd:
      PRICES.objectStorageBase +
      perMillion(load.reads, PRICES.objectReadsPerMillion) +
      perMillion(load.writes, PRICES.objectWritesPerMillion),
    basis: "storage and its requests",
  }),
  "search-index": (node) => {
    const copies = node.props.shards * (node.props.replicas + 1);

    return {
      monthlyUsd: Math.ceil(copies / 3) * PRICES.searchCopy,
      basis: `${Math.ceil(copies / 3)} nodes for ${copies} shard copies`,
    };
  },
  "rate-limiter": flat(PRICES.rateLimiter, "a small counter store"),
  "connection-pooler": flat(PRICES.connectionPooler, "a small instance"),
  scheduler: flat(PRICES.scheduler, "a scheduled trigger"),
  coordination: (node) => ({
    monthlyUsd: node.props.members * PRICES.coordinationMember,
    basis: `${node.props.members} members`,
  }),
  monitoring: flat(PRICES.monitoring, "a metrics server"),
  "nat-gateway": flat(PRICES.natGateway, "an hourly charge"),
  secret: flat(PRICES.secret, "a stored secret"),
};

const kindCost = (
  graph: DesignGraph,
  node: DesignNode,
  load: NodeLoad,
): Charge =>
  (KIND_COSTS[node.kind] as unknown as KindCost<DesignNode>)(node, load, graph);

export const nodeCost = (
  graph: DesignGraph,
  node: DesignNode,
  load: NodeLoad = IDLE,
): NodeCost => {
  const product = node.technology
    ? findTechnology(node.technology.id, node.kind)
    : undefined;
  const settings = product?.props.safeParse(node.technology?.props ?? {});

  if (product?.monthlyUsd && settings?.success) {
    return {
      nodeId: node.id,
      monthlyUsd: product.monthlyUsd(settings.data, load),
      basis: `${product.label} list price`,
    };
  }

  return { nodeId: node.id, ...kindCost(graph, node, load) };
};

export const costOf = (
  graph: DesignGraph,
  loads: Readonly<Record<string, NodeLoad>> = {},
): CostEstimate => {
  const nodes = graph.nodes
    .map((node) => nodeCost(graph, node, loads[node.id] ?? IDLE))
    .map((item) => ({
      ...item,
      monthlyUsd: Math.round(item.monthlyUsd * 100) / 100,
    }));

  return {
    monthlyUsd: Math.round(
      nodes.reduce((sum, item) => sum + item.monthlyUsd, 0),
    ),
    nodes,
  };
};
