import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { millis, rate, ratio } from "./shared";

export const cdnKind = defineNodeKind({
  kind: "cdn",
  track: "system-design",
  label: "CDN",
  icon: "cdn",
  stateful: false,
  replicable: false,
  distribution: "by-share",
  props: z.strictObject({
    hitRatio: ratio(0.9),
    ttlSeconds: z.number().int().min(0).max(31_536_000).default(300),
    capacityRps: rate(100_000),
    baseLatencyMs: millis(10),
  }),
});
