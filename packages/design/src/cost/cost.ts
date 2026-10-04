import { findTechnology } from "../catalogue/technologies";
import type { DesignGraph, DesignNode } from "../graph";
import { perMillion, PRICES } from "./prices";

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

const kindCost = (
  graph: DesignGraph,
  node: DesignNode,
  load: NodeLoad,
): { monthlyUsd: number; basis: string } => {
  const rps = load.reads + load.writes;

  switch (node.kind) {
    case "service":
    case "worker": {
      const replicas = load.replicas ?? node.props.replicas;

      return {
        monthlyUsd: replicas * PRICES.replica,
        basis: `${round(replicas)} × ${usd(PRICES.replica)} a replica`,
      };
    }
    case "k8s-deployment": {
      const scaler = graph.edges.find(
        (edge) => edge.kind === "scales" && edge.to === node.id,
      );
      const hpa = graph.nodes.find((item) => item.id === scaler?.from);
      const pods =
        load.replicas ??
        (hpa?.kind === "hpa"
          ? Math.min(
              hpa.props.max,
              Math.max(hpa.props.min, node.props.replicas),
            )
          : node.props.replicas);

      return {
        monthlyUsd: pods * PRICES.pod,
        basis: `${round(pods)} × ${usd(PRICES.pod)} a pod`,
      };
    }
    case "sql-database": {
      const standby =
        node.props.failover === "automatic" &&
        !graph.edges.some(
          (edge) => edge.kind === "replication" && edge.from === node.id,
        );
      const copies = standby ? 2 : 1;
      const instances = node.props.shards * copies;

      return {
        monthlyUsd:
          instances * PRICES.sqlInstance +
          node.props.storageGb * node.props.shards * PRICES.sqlStoragePerGb,
        basis: `${instances} instance${instances === 1 ? "" : "s"} and ${node.props.storageGb} GB`,
      };
    }
    case "nosql-database":
      return {
        monthlyUsd:
          node.props.partitions * PRICES.nosqlPartition +
          node.props.storageGb * PRICES.nosqlStoragePerGb,
        basis: `${node.props.partitions} partitions and ${node.props.storageGb} GB`,
      };
    case "cache": {
      const nodes = Math.max(
        1,
        Math.ceil(node.props.readCapacityRps / PRICES.cacheNodeRps),
      );

      return {
        monthlyUsd: nodes * PRICES.cacheNode,
        basis: `${nodes} node${nodes === 1 ? "" : "s"}`,
      };
    }
    case "load-balancer":
    case "ingress":
      return {
        monthlyUsd: PRICES.balancer + (rps / 1_000) * PRICES.balancerPer1000Rps,
        basis: "an hourly charge and capacity units for its traffic",
      };
    case "api-gateway":
      return {
        monthlyUsd: perMillion(rps, PRICES.gatewayPerMillion),
        basis: `${usd(PRICES.gatewayPerMillion)} a million requests`,
      };
    case "cdn":
      return {
        monthlyUsd: perMillion(rps, PRICES.cdnPerMillion),
        basis: `${usd(PRICES.cdnPerMillion)} a million requests`,
      };
    case "dns":
      return { monthlyUsd: PRICES.dns, basis: "a hosted zone" };
    case "queue":
      return {
        monthlyUsd: perMillion(rps, PRICES.queuePerMillion),
        basis: `${usd(PRICES.queuePerMillion)} a million messages`,
      };
    case "stream":
      return {
        monthlyUsd: node.props.partitions * PRICES.streamPartition,
        basis: `${node.props.partitions} partitions`,
      };
    case "object-storage":
      return {
        monthlyUsd:
          PRICES.objectStorageBase +
          perMillion(load.reads, PRICES.objectReadsPerMillion) +
          perMillion(load.writes, PRICES.objectWritesPerMillion),
        basis: "storage and its requests",
      };
    case "search-index": {
      const copies = node.props.shards * (node.props.replicas + 1);

      return {
        monthlyUsd: Math.ceil(copies / 3) * PRICES.searchCopy,
        basis: `${Math.ceil(copies / 3)} nodes for ${copies} shard copies`,
      };
    }
    case "rate-limiter":
      return { monthlyUsd: PRICES.rateLimiter, basis: "a small counter store" };
    case "scheduler":
      return { monthlyUsd: PRICES.scheduler, basis: "a scheduled trigger" };
    case "coordination":
      return {
        monthlyUsd: node.props.members * PRICES.coordinationMember,
        basis: `${node.props.members} members`,
      };
    case "monitoring":
      return { monthlyUsd: PRICES.monitoring, basis: "a metrics server" };
    case "nat-gateway":
      return { monthlyUsd: PRICES.natGateway, basis: "an hourly charge" };
    case "secret":
      return { monthlyUsd: PRICES.secret, basis: "a stored secret" };
    default:
      return { monthlyUsd: 0, basis: "no charge of its own" };
  }
};

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
