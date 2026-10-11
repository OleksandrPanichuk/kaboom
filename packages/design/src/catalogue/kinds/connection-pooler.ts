import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { baseLatency, count, rate } from "./shared";

export const connectionPoolerKind = defineNodeKind({
  kind: "connection-pooler",
  track: "system-design",
  label: "Connection pooler",
  icon: "connection-pooler",
  stateful: false,
  replicable: false,
  carriesTraffic: true,
  distribution: "by-share",
  docs: {
    summary:
      "Sits between the application and a SQL database and lends a few server connections to many clients in turn.",
    useWhen:
      "Many replicas, or functions that each open a connection, would hold more connections than the database accepts.",
    pitfalls: [
      "Its own pool to the database bounds the throughput: a request waits for a free server connection, and too few of them queue the traffic.",
      "Session state such as prepared statements or temporary tables does not survive transaction pooling.",
    ],
  },
  props: z.strictObject({
    maxClientConnections: count(10_000, {
      title: "Max client connections",
      description: "Connections from the application it accepts at once",
    }),
    capacityRps: rate(50_000, {
      title: "Capacity",
      description: "Requests it can pass on before it saturates",
      advanced: true,
    }),
    baseLatencyMs: baseLatency(1),
  }),
});
