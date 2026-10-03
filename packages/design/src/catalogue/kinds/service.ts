import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { Autoscale, baseLatency, count, rate, toggle } from "./shared";

export const serviceKind = defineNodeKind({
  kind: "service",
  track: "system-design",
  label: "Service",
  icon: "service",
  stateful: false,
  replicable: false,
  carriesTraffic: true,
  distribution: "by-share",
  docs: {
    summary:
      "Stateless code that answers requests: an API, a backend, a microservice.",
    useWhen: "Request-response work that has to finish while the caller waits.",
    pitfalls: [
      "One replica is a single point of failure; two behind a load balancer is the usual minimum.",
      "Slow work on the request path (sending email, resizing images) belongs in a queue and a worker.",
      "Every replica added still hits the same database, so scaling the service can move the bottleneck, not remove it.",
    ],
  },
  props: z.strictObject({
    replicas: count(2, {
      title: "Replicas",
      description: "Instances running behind the same name",
    }),
    capacityRpsPerReplica: rate(500, {
      title: "Capacity per replica",
      description: "Requests one instance handles before it saturates",
    }),
    baseLatencyMs: baseLatency(20),
    stateless: toggle(true, {
      title: "Stateless",
      description: "Any replica can serve any request",
    }),
    autoscale: Autoscale,
  }),
});
