import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const partners = () =>
  node("partners", "client", "Partners", { rps: 4_000, readRatio: 0.9 });

export const rateLimitedApi: ProblemContentInput = {
  slug: "rate-limited-api",
  title: "Public pricing API",
  track: "system-design",
  difficulty: "medium",
  tags: ["rate-limiting", "gateway", "back-pressure"],
  summary:
    "Serve prices to partners over a public API that must stay fast when one of them floods it.",
  statement: `Design the public API a travel company gives its partners to look up prices.

**What it does**

- Partners ask for the price of a trip, and now and then report a booking.
- Prices come from a pricing database that is expensive to scale.

**How it is used**

- 4,000 requests a second from all partners together: 90 % are price lookups, 10 % bookings.
- Every so often one partner's code goes wrong and floods the API with five times the usual traffic.
- A partner that behaves should get an answer within 250 ms at p99, even during a flood.

**What to watch**

- The pricing database takes 6,000 lookups and 1,500 writes a second, and it is shared with other systems: it cannot grow to absorb a flood.
- Turning away the flood is better than every partner waiting for a timeout.

The *Partners* client is already on the canvas. Build what it talks to.`,
  baseline: graph([partners()]),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description: "4,000 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 250, availability: 0.999 },
      expect: {
        maxP99Ms: 250,
        minAvailability: 0.999,
        forbid: ["saturated", "throttled"],
      },
    },
    {
      id: "flood",
      title: "A partner floods the API",
      description:
        "Traffic is five times the usual for three minutes. What gets through must stay fast, and everything must work again once the flood stops.",
      visibility: "public",
      durationSeconds: 300,
      traffic: [
        { at: 60, multiplier: 5 },
        { at: 240, multiplier: 1 },
      ],
      slo: { p99Ms: 250, availability: 0 },
      expect: { maxP99Ms: 250, endAvailability: 0.999 },
    },
    {
      id: "long-flood",
      title: "The flood does not stop",
      visibility: "hidden",
      durationSeconds: 600,
      traffic: [{ at: 60, multiplier: 5 }],
      slo: { p99Ms: 250, availability: 0 },
      expect: { maxP99Ms: 250, minAvailability: 0.2 },
    },
    {
      id: "api-replica-lost",
      title: "An API server is lost",
      visibility: "hidden",
      durationSeconds: 300,
      faults: [
        {
          kind: "capacity",
          select: { nodeKind: "service" },
          at: 60,
          factor: 0.75,
        },
      ],
      slo: { p99Ms: 250, availability: 0.999 },
      expect: { maxP99Ms: 250, minAvailability: 0.999 },
    },
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Handles a normal day within the SLO",
      weight: 25,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "stays-fast-in-a-flood",
      title: "Stays fast for what it lets through during a flood",
      weight: 25,
      check: { check: "drill-passes", drillId: "flood" },
    },
    {
      key: "survives-a-long-flood",
      title: "Holds up when the flood does not stop",
      weight: 10,
      check: { check: "drill-passes", drillId: "long-flood" },
    },
    {
      key: "loses-a-server-gracefully",
      title: "Keeps its SLO when it loses a quarter of its servers",
      weight: 10,
      check: { check: "drill-passes", drillId: "api-replica-lost" },
    },
    {
      key: "throttles",
      title: "Limits traffic before the database",
      weight: 20,
      check: { check: "throttles" },
    },
    {
      key: "no-single-point-of-failure",
      title: "Has no single point of failure",
      weight: 10,
      check: { check: "no-lint", lint: "spof-critical-path" },
    },
  ],
  reference: {
    notes:
      "A gateway throttles at 5,000 requests a second, above the normal 4,000 and below what the pricing database can take (4,500 lookups and 500 bookings at the limit, against 6,000 and 1,500). Behind it, a service with room to lose a quarter of its replicas, and the database with a replica and automatic failover. During a flood the gateway turns most of it away at once, so the requests it admits never queue.",
    graph: graph(
      [
        partners(),
        node("gateway", "api-gateway", "Gateway", {
          throttle: { enabled: true, limitRps: 5_000 },
        }),
        node("api", "service", "Pricing API", {
          replicas: 8,
          capacityRpsPerReplica: 1_000,
        }),
        node("db", "sql-database", "Prices", {
          failover: "automatic",
          readCapacityRps: 6_000,
          writeCapacityRps: 1_500,
        }),
        node("replica", "sql-database", "Prices replica"),
      ],
      [
        edge("partners", "gateway", "sync-call"),
        edge("gateway", "api", "sync-call"),
        edge("api", "db", "read"),
        edge("api", "db", "write"),
        edge("db", "replica", "replication"),
      ],
    ),
  },
};
