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
    replicas: count(2),
    capacityMsgPerReplica: rate(100),
    processingMs: millis(50),
    autoscale: Autoscale,
  }),
});
