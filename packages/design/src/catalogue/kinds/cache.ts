import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { millis, rate, ratio } from "./shared";

export const cacheKind = defineNodeKind({
  kind: "cache",
  track: "system-design",
  label: "Cache",
  icon: "cache",
  stateful: true,
  replicable: true,
  distribution: "by-share",
  props: z.strictObject({
    hitRatio: ratio(0.8),
    capacityRps: rate(50_000),
    baseLatencyMs: millis(1),
    evictionPolicy: z.enum(["lru", "lfu", "ttl"]).default("lru"),
    writePolicy: z.enum(["through", "around", "back"]).default("around"),
  }),
});
