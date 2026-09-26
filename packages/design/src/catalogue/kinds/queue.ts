import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { count, rate } from "./shared";

export const queueKind = defineNodeKind({
  kind: "queue",
  track: "system-design",
  label: "Queue",
  icon: "queue",
  stateful: true,
  replicable: false,
  distribution: "by-share",
  props: z.strictObject({
    partitions: count(1),
    retentionHours: z.number().int().min(1).max(8_760).default(24),
    deliveryGuarantee: z
      .enum(["at-most-once", "at-least-once", "exactly-once"])
      .default("at-least-once"),
    capacityMsgPerSecond: rate(10_000),
  }),
});
