import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { baseLatency, rate, ratio } from "./shared";

export const externalApiKind = defineNodeKind({
  kind: "external-api",
  track: "system-design",
  label: "External API",
  icon: "external-api",
  stateful: false,
  replicable: false,
  carriesTraffic: true,
  distribution: "by-share",
  docs: {
    summary:
      "A service another company runs, such as payments, SMS or email, with its own limits and outages.",
    useWhen:
      "Your system depends on a third party it cannot scale, fix or restart.",
    pitfalls: [
      "Called on the request path, its error rate and latency become your users'.",
      "Its rate limit is fixed: calls above it fail at once, however many replicas you add.",
      "A queue in front lets its outages grow a backlog instead of failing users.",
    ],
  },
  props: z.strictObject({
    rateLimitRps: rate(500, {
      title: "Rate limit",
      description: "Calls a second the provider accepts; the rest fail at once",
    }),
    errorRate: ratio(0.01, {
      title: "Error rate",
      description: "Share of calls it fails on a normal day",
    }),
    baseLatencyMs: baseLatency(150),
  }),
});
