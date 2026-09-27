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
  docs: {
    summary:
      "Where requests come from: users, devices or another company's system calling yours.",
    useWhen:
      "Every design starts with one. Set how many requests a second it sends and how many of them read.",
    pitfalls: [
      "A client with no outgoing edge fails every request it sends.",
      "Nothing can send requests into a client, so draw edges out of it only.",
    ],
  },
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
