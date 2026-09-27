import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";
import { choice, count, rate } from "./shared";

export const streamKind = defineNodeKind({
  kind: "stream",
  track: "system-design",
  label: "Event stream",
  icon: "stream",
  stateful: true,
  replicable: false,
  distribution: "broadcast",
  props: z.strictObject({
    partitions: count(6, {
      title: "Partitions",
      description:
        "Ordered logs the stream is split into; a consumer group reads each with at most one consumer",
    }),
    capacityMsgPerSecond: rate(50_000, {
      title: "Capacity",
      description: "Messages per second the stream accepts",
      unit: "msg/s",
    }),
    retentionHours: prop(z.number().int().min(1).max(87_600).default(168), {
      title: "Retention",
      description:
        "How long a message is kept, read or not; any consumer can replay from inside it",
      unit: "h",
    }),
    replicationFactor: prop(z.number().int().min(1).max(5).default(3), {
      title: "Replication factor",
      description: "Copies of each partition kept on different brokers",
      unit: "count",
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
