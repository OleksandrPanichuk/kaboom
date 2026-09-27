import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { Autoscale, count, millis, rate } from "./shared";

export const workerKind = defineNodeKind({
  kind: "worker",
  track: "system-design",
  label: "Worker",
  icon: "worker",
  stateful: false,
  replicable: false,
  distribution: "by-share",
  docs: {
    summary:
      "Takes jobs from a queue or events from a stream and processes them in the background.",
    useWhen:
      "Work the caller does not need to wait for, or bursts the system should absorb at its own pace.",
    pitfalls: [
      "Too few workers let the backlog grow without bound during a spike.",
      "With at-least-once delivery a job can run twice, so the work must be idempotent.",
    ],
  },
  props: z.strictObject({
    replicas: count(2, {
      title: "Replicas",
      description: "Consumers running in parallel",
    }),
    capacityMsgPerReplica: rate(100, {
      title: "Capacity per replica",
      description: "Messages one consumer processes per second",
      unit: "msg/s",
    }),
    processingMs: millis(50, {
      title: "Processing time",
      description: "Time to handle one message",
    }),
    autoscale: Autoscale,
  }),
});
