import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";
import { baseLatency, rate, ratio } from "./shared";

export const cdnKind = defineNodeKind({
  kind: "cdn",
  track: "system-design",
  label: "CDN",
  icon: "cdn",
  stateful: false,
  replicable: false,
  distribution: "by-share",
  props: z.strictObject({
    hitRatio: ratio(0.9, {
      title: "Hit ratio",
      description: "Share of reads answered at the edge",
    }),
    ttlSeconds: prop(z.number().int().min(0).max(31_536_000).default(300), {
      title: "TTL",
      description: "How long the edge keeps a response",
      unit: "s",
    }),
    capacityRps: rate(100_000, {
      title: "Capacity",
      description: "Requests the edge can serve",
      advanced: true,
    }),
    baseLatencyMs: baseLatency(10),
  }),
});
