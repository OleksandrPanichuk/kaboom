import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";
import { choice, count, rate } from "./shared";

export const queueKind = defineNodeKind({
  kind: "queue",
  track: "system-design",
  label: "Work queue",
  icon: "queue",
  stateful: true,
  replicable: false,
  distribution: "by-share",
  docs: {
    summary:
      "Holds jobs until a worker takes them. Each job goes to exactly one consumer.",
    useWhen:
      "Moving slow or bursty work off the request path, and smoothing spikes the workers cannot take at once.",
    pitfalls: [
      "A queue only delays the problem if workers cannot keep up on average.",
      "Retention limits how long a backlog can wait before jobs are lost.",
    ],
  },
  props: z.strictObject({
    partitions: count(1, {
      title: "Partitions",
      description:
        "Ordered lanes, such as FIFO message groups; consumers share the work and each message goes to one of them",
    }),
    capacityMsgPerSecond: rate(10_000, {
      title: "Capacity",
      description: "Messages per second the queue accepts",
      unit: "msg/s",
    }),
    retentionHours: prop(z.number().int().min(1).max(8_760).default(24), {
      title: "Retention",
      description:
        "How long an unconsumed message is kept; a consumed one is removed",
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
