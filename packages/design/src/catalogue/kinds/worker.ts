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
