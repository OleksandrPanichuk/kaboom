import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { rate, ratio } from "./shared";

export const clientKind = defineNodeKind({
  kind: "client",
  track: "system-design",
  label: "Client",
  icon: "client",
  stateful: false,
  replicable: false,
  distribution: "by-share",
  props: z.strictObject({
    rps: rate(100),
    readRatio: ratio(0.9),
    payloadKb: z.number().positive().max(100_000).default(2),
  }),
});
