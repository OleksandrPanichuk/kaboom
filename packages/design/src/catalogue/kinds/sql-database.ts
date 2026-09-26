import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { count, millis, rate } from "./shared";

export const sqlDatabaseKind = defineNodeKind({
  kind: "sql-database",
  track: "system-design",
  label: "SQL database",
  icon: "sql-database",
  stateful: true,
  replicable: true,
  distribution: "by-share",
  props: z.strictObject({
    capacityRps: rate(1_000),
    baseLatencyMs: millis(5),
    failover: z.enum(["none", "manual", "automatic"]).default("none"),
    shards: count(1),
    shardKey: z.string().max(80).default(""),
  }),
});
