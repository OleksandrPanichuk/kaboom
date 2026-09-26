import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";
import {
  baseLatency,
  choice,
  count,
  gigabytes,
  kilobytes,
  rate,
} from "./shared";

export const nosqlDatabaseKind = defineNodeKind({
  kind: "nosql-database",
  track: "system-design",
  label: "NoSQL database",
  icon: "nosql-database",
  stateful: true,
  replicable: true,
  distribution: "by-share",
  props: z.strictObject({
    consistency: choice(["eventual", "strong"], "eventual", {
      title: "Consistency",
      description: "Whether a read always sees the latest write",
    }),
    partitions: count(4, {
      title: "Partitions",
      description: "Slices of the key space served independently",
    }),
    readCapacityPerPartition: rate(3_000, {
      title: "Read capacity per partition",
      description:
        "Reads one partition serves; a hot key saturates one partition",
    }),
    writeCapacityPerPartition: rate(1_000, {
      title: "Write capacity per partition",
      description: "Writes one partition accepts",
    }),
    replicationFactor: prop(z.number().int().min(1).max(9).default(3), {
      title: "Replication factor",
      description: "Copies kept of every item",
      unit: "count",
    }),
    storageGb: gigabytes(1_000, {
      title: "Storage",
      description: "Disk available to one copy of the data",
    }),
    recordSizeKb: kilobytes(1, {
      title: "Item size",
      description: "Average size of one written item",
      advanced: true,
    }),
    baseLatencyMs: baseLatency(5),
  }),
});
