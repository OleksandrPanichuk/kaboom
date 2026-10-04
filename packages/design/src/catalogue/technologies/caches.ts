import z from "zod";

import { HOURS_PER_MONTH } from "../../cost/prices";
import { defineTechnology } from "../define-technology";
import { choice, count, gigabytes } from "../kinds/shared";

const ELASTICACHE_NODES = {
  "cache.t4g.medium": { memoryGb: 3, rps: 60_000, hourly: 0.065 },
  "cache.r6g.large": { memoryGb: 13, rps: 150_000, hourly: 0.206 },
  "cache.r6g.xlarge": { memoryGb: 26, rps: 250_000, hourly: 0.411 },
} as const;

type ElasticacheNode = keyof typeof ELASTICACHE_NODES;

export const redis = defineTechnology({
  id: "redis",
  kind: "cache",
  provider: "self-hosted",
  label: "Redis",
  icon: "redis",
  monogram: "R",
  summary:
    "An in-memory store on one thread per shard; a cluster spreads keys over shards.",
  props: z.strictObject({
    shards: count(1, {
      title: "Shards",
      description: "Primaries the keys are spread over",
    }),
    memoryGb: gigabytes(8, {
      title: "Memory per shard",
      description: "RAM of each primary",
    }),
  }),
  derive: ({ shards, memoryGb }) => ({
    readCapacityRps: shards * 100_000,
    writeCapacityRps: shards * 80_000,
    memoryGb: shards * memoryGb,
  }),
});

export const amazonElasticache = defineTechnology({
  id: "amazon-elasticache",
  kind: "cache",
  provider: "aws",
  label: "Amazon ElastiCache for Redis",
  icon: "amazonelasticache",
  monogram: "EC",
  summary: "Managed Redis, sized by node type and shards.",
  props: z.strictObject({
    nodeType: choice(
      Object.keys(ELASTICACHE_NODES) as [ElasticacheNode, ...ElasticacheNode[]],
      "cache.r6g.large",
      { title: "Node type", description: "Size of every node" },
    ),
    shards: count(1, {
      title: "Shards",
      description: "Node groups the keys are spread over",
    }),
  }),
  derive: ({ nodeType, shards }) => ({
    readCapacityRps: shards * ELASTICACHE_NODES[nodeType].rps,
    writeCapacityRps: Math.round(
      shards * ELASTICACHE_NODES[nodeType].rps * 0.8,
    ),
    memoryGb: shards * ELASTICACHE_NODES[nodeType].memoryGb,
  }),
  monthlyUsd: ({ nodeType, shards }) =>
    ELASTICACHE_NODES[nodeType].hourly * HOURS_PER_MONTH * shards,
});

export const memcached = defineTechnology({
  id: "memcached",
  kind: "cache",
  provider: "self-hosted",
  label: "Memcached",
  icon: "memcached",
  monogram: "MC",
  summary:
    "A plain multithreaded cache: no persistence, no replication, and it scales by adding nodes.",
  props: z.strictObject({
    nodes: count(2, {
      title: "Nodes",
      description: "Servers the keys are hashed over",
    }),
    memoryGb: gigabytes(16, {
      title: "Memory per node",
      description: "RAM of each node",
    }),
  }),
  derive: ({ nodes, memoryGb }) => ({
    readCapacityRps: nodes * 200_000,
    writeCapacityRps: nodes * 150_000,
    memoryGb: nodes * memoryGb,
    evictionPolicy: "lru" as const,
  }),
});
