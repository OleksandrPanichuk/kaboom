import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { baseLatency, choice, gigabytes, rate, ratio } from "./shared";

export const cacheKind = defineNodeKind({
  kind: "cache",
  track: "system-design",
  label: "Cache",
  icon: "cache",
  stateful: true,
  replicable: true,
  distribution: "by-share",
  props: z.strictObject({
    hitRatio: ratio(0.8, {
      title: "Hit ratio",
      description: "Share of reads answered without the store behind",
    }),
    readCapacityRps: rate(100_000, {
      title: "Read capacity",
      description: "Reads the cache serves before it saturates",
    }),
    writeCapacityRps: rate(50_000, {
      title: "Write capacity",
      description: "Writes and invalidations it absorbs",
    }),
    memoryGb: gigabytes(8, {
      title: "Memory",
      description: "Data the cache can hold before it evicts",
    }),
    baseLatencyMs: baseLatency(1),
    evictionPolicy: choice(["lru", "lfu", "ttl"], "lru", {
      title: "Eviction",
      description: "Which entries go first when memory runs out",
      advanced: true,
    }),
    writePolicy: choice(["through", "around", "back"], "around", {
      title: "Write policy",
      description:
        "Through writes both, around writes the store only, back writes the cache and flushes later",
    }),
  }),
});
