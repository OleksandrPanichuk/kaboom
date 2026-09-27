import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const users = () =>
  node("users", "client", "Users", { rps: 10_000, readRatio: 0.95 });

export const urlShortener: ProblemContentInput = {
  slug: "url-shortener",
  title: "URL shortener",
  track: "system-design",
  difficulty: "easy",
  tags: ["caching", "replication", "read-heavy"],
  summary:
    "Turn long links into short ones and send millions of visitors to the right place, fast.",
  statement: `Design a service like bit.ly.

**What it does**

- Anyone can shorten a long URL and get back a short one.
- Opening a short URL redirects to the long one.

**How it is used**

- 10,000 requests a second at a normal time; 95 % of them are redirects and 5 % create a link.
- A link that goes viral can bring four times the usual traffic for a few minutes.
- A redirect should answer within 200 ms at p99, and 99.9 % of requests must succeed.

**What to watch**

- Redirects are reads of a link that almost never changes after it is made.
- Losing the database must not lose the service for long.

The *Users* client is already on the canvas. Build what it talks to.`,
  baseline: graph([users()]),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description: "10,000 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 200, availability: 0.999 },
      expect: { maxP99Ms: 200, minAvailability: 0.999, forbid: ["saturated"] },
    },
    {
      id: "viral-link",
      title: "A link goes viral",
      description: "Traffic quadruples for three minutes, then falls back.",
      visibility: "public",
      durationSeconds: 300,
      traffic: [
        { at: 60, multiplier: 4 },
        { at: 240, multiplier: 1 },
      ],
      slo: { p99Ms: 400, availability: 0.99 },
      expect: { maxP99Ms: 400, minAvailability: 0.99 },
    },
    {
      id: "primary-fails",
      title: "The database primary fails",
      visibility: "hidden",
      durationSeconds: 300,
      faults: [
        {
          kind: "node-down",
          select: { nodeKind: "sql-database", role: "primary" },
          at: 60,
        },
      ],
      expect: { endAvailability: 0.999 },
    },
    {
      id: "cache-flush",
      title: "The cache is flushed",
      visibility: "hidden",
      durationSeconds: 300,
      faults: [{ kind: "cache-flush", select: { nodeKind: "cache" }, at: 60 }],
      slo: { p99Ms: 500, availability: 0.99 },
      expect: { maxP99Ms: 500, minAvailability: 0.99 },
    },
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Handles a normal day within the SLO",
      weight: 30,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "survives-a-viral-link",
      title: "Stays up when a link goes viral",
      weight: 20,
      check: { check: "drill-passes", drillId: "viral-link" },
    },
    {
      key: "recovers-from-primary-failure",
      title: "Recovers when the database primary fails",
      weight: 20,
      check: { check: "drill-passes", drillId: "primary-fails" },
    },
    {
      key: "survives-a-cache-flush",
      title: "Survives an empty cache",
      weight: 10,
      check: { check: "drill-passes", drillId: "cache-flush" },
    },
    {
      key: "no-single-point-of-failure",
      title: "Has no single point of failure",
      weight: 10,
      check: { check: "no-lint", lint: "spof-critical-path" },
    },
    {
      key: "caches-redirects",
      title: "Caches redirects",
      weight: 10,
      check: { check: "has-node-kind", nodeKind: "cache" },
    },
  ],
  reference: {
    notes:
      "A balancer in front of a stateless service with room for the viral peak. Redirects read through a cache with a 90 % hit ratio; creations write to a sharded primary with automatic failover and two read replicas, which also carry the reads when the cache is empty.",
    graph: graph(
      [
        users(),
        node("lb", "load-balancer", "Load balancer"),
        node("api", "service", "Shortener API", {
          replicas: 20,
          capacityRpsPerReplica: 2_500,
        }),
        node("cache", "cache", "Link cache", {
          hitRatio: 0.9,
          readCapacityRps: 100_000,
        }),
        node("db", "sql-database", "Links", {
          failover: "automatic",
          shards: 2,
          readCapacityRps: 5_000,
          writeCapacityRps: 2_000,
        }),
        node("replica-a", "sql-database", "Links replica A"),
        node("replica-b", "sql-database", "Links replica B"),
      ],
      [
        edge("users", "lb", "sync-call"),
        edge("lb", "api", "sync-call"),
        edge("api", "cache", "read"),
        edge("cache", "db", "read"),
        edge("api", "db", "write"),
        edge("db", "replica-a", "replication"),
        edge("db", "replica-b", "replication"),
      ],
    ),
  },
};
