import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";
import { choice, count, rate } from "./shared";

export const queueKind = defineNodeKind({
  kind: "queue",
  track: "system-design",
  label: "Queue",
  icon: "queue",
  stateful: true,
  replicable: false,
  distribution: "by-share",
  props: z.strictObject({
    partitions: count(1, {
      title: "Partitions",
      description: "Ordered lanes; consumers work them in parallel",
    }),
    capacityMsgPerSecond: rate(10_000, {
      title: "Capacity",
      description: "Messages per second the queue accepts",
      unit: "msg/s",
    }),
    retentionHours: prop(z.number().int().min(1).max(8_760).default(24), {
      title: "Retention",
      description: "How long an unconsumed message is kept",
      unit: "h",
    }),
    deliveryGuarantee: choice(
      ["at-most-once", "at-least-once", "exactly-once"],
      "at-least-once",
      {
        title: "Delivery",
        description: "Whether a message can be lost or delivered twice",
      },
    ),
  }),
});
