import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { baseLatency, choice, rate, toggle } from "./shared";

export const loadBalancerKind = defineNodeKind({
  kind: "load-balancer",
  track: "system-design",
  label: "Load balancer",
  icon: "load-balancer",
  stateful: false,
  replicable: false,
  distribution: "evenly",
  docs: {
    summary:
      "Spreads requests evenly over the nodes behind it and stops sending to those that fail health checks.",
    useWhen:
      "Whenever more than one replica or service answers the same requests.",
    pitfalls: [
      "A single load balancer is itself a single point of failure.",
      "It balances; it does not add capacity. Too few replicas behind it still saturate.",
    ],
  },
  props: z.strictObject({
    algorithm: choice(
      ["round-robin", "least-connections", "ip-hash"],
      "round-robin",
      {
        title: "Algorithm",
        description: "How requests are spread over healthy targets",
      },
    ),
    layer: choice(["l4", "l7"], "l7", {
      title: "Layer",
      description: "L4 routes connections, L7 routes requests",
    }),
    healthCheck: toggle(true, {
      title: "Health checks",
      description: "Stops sending to a target that fails its check",
    }),
    capacityRps: rate(50_000, {
      title: "Capacity",
      description: "Requests the balancer itself can pass",
      advanced: true,
    }),
    baseLatencyMs: baseLatency(1),
  }),
});
