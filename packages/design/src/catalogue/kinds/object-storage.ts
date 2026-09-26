import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { baseLatency, kilobytes, rate } from "./shared";

export const objectStorageKind = defineNodeKind({
  kind: "object-storage",
  track: "system-design",
  label: "Object storage",
  icon: "object-storage",
  stateful: true,
  replicable: false,
  distribution: "by-share",
  props: z.strictObject({
    readCapacityRps: rate(5_500, {
      title: "Read capacity",
      description: "Reads per second per key prefix",
    }),
    writeCapacityRps: rate(3_500, {
      title: "Write capacity",
      description: "Writes per second per key prefix",
    }),
    objectSizeKb: kilobytes(512, {
      title: "Object size",
      description: "Average size of one stored object",
      advanced: true,
    }),
    baseLatencyMs: baseLatency(50),
  }),
});
