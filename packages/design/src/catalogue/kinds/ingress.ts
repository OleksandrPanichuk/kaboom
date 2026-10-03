import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { baseLatency, rate, toggle } from "./shared";

export const ingressKind = defineNodeKind({
  kind: "ingress",
  track: "devops",
  label: "Ingress",
  icon: "ingress",
  stateful: false,
  replicable: false,
  carriesTraffic: true,
  distribution: "by-share",
  docs: {
    summary:
      "The cluster's front door: routes outside HTTP traffic to services by host and path.",
    useWhen: "Requests from outside the cluster have to reach a service in it.",
    pitfalls: [
      "One controller replica is a single point of failure for every route behind it.",
      "Terminating TLS here leaves traffic inside the cluster unencrypted unless something else covers it.",
    ],
  },
  props: z.strictObject({
    tls: toggle(true, {
      title: "TLS",
      description: "Terminates HTTPS at the edge of the cluster",
    }),
    capacityRps: rate(50_000, {
      title: "Capacity",
      description: "Requests the controller itself can pass",
      advanced: true,
    }),
    baseLatencyMs: baseLatency(1),
  }),
});
