import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { kilobytes, rate, ratio } from "./shared";

export const clientKind = defineNodeKind({
  kind: "client",
  track: "system-design",
  label: "Client",
  icon: "client",
  stateful: false,
  replicable: false,
  distribution: "by-share",
  props: z.strictObject({
    rps: rate(100, {
      title: "Requests",
      description: "Requests these clients send at normal load",
    }),
    readRatio: ratio(0.9, {
      title: "Read ratio",
      description: "Share of requests that only read",
    }),
    payloadKb: kilobytes(2, {
      title: "Payload size",
      description: "Average size of one request or response",
      advanced: true,
    }),
  }),
});
