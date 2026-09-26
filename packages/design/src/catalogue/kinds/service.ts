import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { Autoscale, baseLatency, count, rate, toggle } from "./shared";

export const serviceKind = defineNodeKind({
  kind: "service",
  track: "system-design",
  label: "Service",
  icon: "service",
  stateful: false,
  replicable: false,
  distribution: "by-share",
  props: z.strictObject({
    replicas: count(2, {
      title: "Replicas",
      description: "Instances running behind the same name",
    }),
    capacityRpsPerReplica: rate(500, {
      title: "Capacity per replica",
      description: "Requests one instance handles before it saturates",
    }),
    baseLatencyMs: baseLatency(20),
    stateless: toggle(true, {
      title: "Stateless",
      description: "Any replica can serve any request",
    }),
    autoscale: Autoscale,
  }),
});
