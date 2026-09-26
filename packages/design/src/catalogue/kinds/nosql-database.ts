import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { count, millis, rate } from "./shared";

export const nosqlDatabaseKind = defineNodeKind({
  kind: "nosql-database",
  track: "system-design",
  label: "NoSQL database",
  icon: "nosql-database",
  stateful: true,
  replicable: true,
  distribution: "by-share",
  props: z.strictObject({
    consistency: z.enum(["eventual", "strong"]).default("eventual"),
    partitions: count(4),
    replicationFactor: z.number().int().min(1).max(9).default(3),
    capacityRpsPerPartition: rate(1_000),
    baseLatencyMs: millis(5),
  }),
});
