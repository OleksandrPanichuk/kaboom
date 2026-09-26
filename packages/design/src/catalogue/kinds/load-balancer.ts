import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { millis, rate } from "./shared";

export const loadBalancerKind = defineNodeKind({
  kind: "load-balancer",
  track: "system-design",
  label: "Load balancer",
  icon: "load-balancer",
  stateful: false,
  replicable: false,
  distribution: "evenly",
  props: z.strictObject({
    algorithm: z
      .enum(["round-robin", "least-connections", "ip-hash"])
      .default("round-robin"),
    layer: z.enum(["l4", "l7"]).default("l7"),
    healthCheck: z.boolean().default(true),
    capacityRps: rate(50_000),
    baseLatencyMs: millis(1),
  }),
});
