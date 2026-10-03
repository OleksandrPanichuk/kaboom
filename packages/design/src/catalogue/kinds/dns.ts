import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";
import { choice } from "./shared";

export const dnsKind = defineNodeKind({
  kind: "dns",
  track: "system-design",
  label: "DNS",
  icon: "dns",
  stateful: false,
  replicable: false,
  carriesTraffic: true,
  distribution: "routed",
  docs: {
    summary:
      "Tells clients which address to use, so it decides which region each user reaches and moves them when one fails.",
    useWhen:
      "The system runs in more than one region, for lower latency near users or to survive losing a region.",
    pitfalls: [
      "Clients cache an answer for its TTL, so after a region fails they keep going there until it runs out.",
      "Failing over moves a whole region's traffic onto the other one; size it for both.",
    ],
  },
  props: z.strictObject({
    policy: choice(["latency", "failover"], "latency", {
      title: "Policy",
      description:
        "Latency spreads users over healthy regions by share; failover sends everyone to the largest-share healthy one",
    }),
    ttlSeconds: prop(z.number().int().min(0).max(86_400).default(60), {
      title: "TTL",
      description:
        "How long clients keep an answer; traffic moves off a failed region only after it",
      unit: "s",
    }),
  }),
});
