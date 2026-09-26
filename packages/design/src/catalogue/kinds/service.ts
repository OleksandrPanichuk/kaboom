import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { Autoscale, count, millis, rate } from "./shared";

export const serviceKind = defineNodeKind({
  kind: "service",
  track: "system-design",
  label: "Service",
  icon: "service",
  stateful: false,
  replicable: false,
  distribution: "by-share",
  props: z.strictObject({
    replicas: count(2),
    capacityRpsPerReplica: rate(500),
    baseLatencyMs: millis(20),
    stateless: z.boolean().default(true),
    autoscale: Autoscale,
  }),
});
