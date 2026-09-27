import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";
import { baseLatency, rate, toggle } from "./shared";

export const apiGatewayKind = defineNodeKind({
  kind: "api-gateway",
  track: "system-design",
  label: "API gateway",
  icon: "api-gateway",
  stateful: false,
  replicable: false,
  distribution: "by-share",
  docs: {
    summary:
      "The single front door of an API: routes each request to the service behind it and can throttle clients.",
    useWhen:
      "Several services sit behind one public API, or the API needs one place for auth, routing and rate limits.",
    pitfalls: [
      "Without throttling, a spike passes straight through to everything behind it.",
      "Routing is by share: set each outgoing edge's share to the part of the traffic that goes there.",
    ],
  },
  props: z.strictObject({
    capacityRps: rate(50_000, {
      title: "Capacity",
      description: "Requests the gateway handles before it saturates",
    }),
    baseLatencyMs: baseLatency(5),
    throttle: prop(
      z
        .strictObject({
          enabled: toggle(false, { title: "Enabled" }),
          limitRps: rate(10_000, {
            title: "Limit",
            description:
              "Requests a second it lets through; the rest fail at once",
          }),
        })
        .default({ enabled: false, limitRps: 10_000 }),
      {
        title: "Throttling",
        description:
          "Turns away requests above a limit instead of passing them on",
      },
    ),
  }),
});
