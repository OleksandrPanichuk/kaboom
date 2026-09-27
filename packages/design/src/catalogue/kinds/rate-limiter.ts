import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { baseLatency, rate } from "./shared";

export const rateLimiterKind = defineNodeKind({
  kind: "rate-limiter",
  track: "system-design",
  label: "Rate limiter",
  icon: "rate-limiter",
  stateful: false,
  replicable: false,
  distribution: "by-share",
  docs: {
    summary:
      "Lets through at most a set number of requests a second and turns the rest away at once.",
    useWhen:
      "A spike or an abusive client could overload what is behind it, and losing the excess is better than losing everything.",
    pitfalls: [
      "Requests it turns away still fail for the user; it protects the system, not their availability.",
      "A limit above what the database can take protects nothing.",
    ],
  },
  props: z.strictObject({
    limitRps: rate(10_000, {
      title: "Limit",
      description: "Requests a second it lets through; the rest fail at once",
    }),
    capacityRps: rate(200_000, {
      title: "Capacity",
      description: "Requests it can check before it saturates",
      advanced: true,
    }),
    baseLatencyMs: baseLatency(1),
  }),
});
