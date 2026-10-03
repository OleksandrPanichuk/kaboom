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
  carriesTraffic: true,
  distribution: "by-share",
  docs: {
    summary:
      "Serves cached copies of static or rarely changing responses from servers close to the user.",
    useWhen:
      "Images, video, scripts and pages that many users read and nobody changes often.",
    pitfalls: [
      "Only the hit ratio is served at the edge; every miss still reaches what is behind it.",
      "A long TTL keeps stale content after it changes, and a short one sends more misses to the origin.",
    ],
  },
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
