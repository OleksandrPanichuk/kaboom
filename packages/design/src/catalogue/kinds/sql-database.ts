import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";
import {
  baseLatency,
  choice,
  count,
  gigabytes,
  kilobytes,
  optionalCount,
  rate,
} from "./shared";

export const DEFAULT_MAX_CONNECTIONS = 1_000;

export const sqlDatabaseKind = defineNodeKind({
  kind: "sql-database",
  track: "system-design",
  label: "SQL database",
  icon: "sql-database",
  stateful: true,
  replicable: true,
  carriesTraffic: true,
  distribution: "by-share",
  docs: {
    summary:
      "A relational database with transactions: the usual system of record.",
    useWhen:
      "Data with relationships, constraints and writes that must be all or nothing.",
    pitfalls: [
      "Without failover and a replica, losing the primary takes every write down.",
      "Writes go to the primary only; replicas add read capacity, never write capacity.",
      "Sharding adds write capacity but makes queries across shards expensive.",
      "Every replica of every caller holds its own pool of connections, so scaling out the callers can exhaust the database's connection limit.",
    ],
  },
  props: z.strictObject({
    readCapacityRps: rate(5_000, {
      title: "Read capacity",
      description: "Queries per second one node answers",
    }),
    writeCapacityRps: rate(1_000, {
      title: "Write capacity",
      description: "Writes per second the primary commits; replicas add none",
    }),
    maxConnections: optionalCount(DEFAULT_MAX_CONNECTIONS, {
      title: "Max connections",
      description:
        "Connections the server accepts at once; a larger limit needs a larger instance",
    }),
    storageGb: gigabytes(500, {
      title: "Storage",
      description: "Disk available to the data",
    }),
    recordSizeKb: kilobytes(1, {
      title: "Record size",
      description: "Average size of one written row, indexes included",
      advanced: true,
    }),
    baseLatencyMs: baseLatency(5),
    failover: choice(["none", "manual", "automatic"], "none", {
      title: "Failover",
      description:
        "How a replica takes over when the primary fails: never, after about five minutes, or after about thirty seconds",
    }),
    shards: count(1, {
      title: "Shards",
      description:
        "Independent partitions of the data, each with its own primary",
    }),
    shardKey: prop(z.string().max(80).default(""), {
      title: "Shard key",
      description: "The column that decides a row's shard",
      advanced: true,
    }),
  }),
});
