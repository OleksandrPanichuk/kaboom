import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { millis, rate } from "./shared";

export const objectStorageKind = defineNodeKind({
  kind: "object-storage",
  track: "system-design",
  label: "Object storage",
  icon: "object-storage",
  stateful: true,
  replicable: false,
  distribution: "by-share",
  props: z.strictObject({
    capacityRps: rate(5_000),
    baseLatencyMs: millis(50),
  }),
});
