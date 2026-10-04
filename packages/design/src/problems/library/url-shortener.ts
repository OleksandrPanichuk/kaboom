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
      weight: 25,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "survives-a-viral-link",
      title: "Stays up when a link goes viral",
      weight: 15,
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
      weight: 5,
      check: { check: "drill-passes", drillId: "cache-flush" },
    },
    {
      key: "no-single-point-of-failure",
      title: "Has no single point of failure",
      weight: 5,
      check: { check: "no-lint", lint: "spof-critical-path" },
    },
    {
      key: "caches-redirects",
      title: "Caches redirects",
      weight: 10,
      check: {
        check: "serves-reads",
        drillId: "normal-day",
        nodeKind: "cache",
        minShare: 0.8,
      },
    },
    {
      key: "survives-unseen-faults",
      title: "Survives faults drawn from the design itself",
      weight: 15,
      check: { check: "chaos-coverage", min: 1 },
    },
    {
      key: "fits-the-budget",
      title: "Runs for under $4,000 a month",
      weight: 5,
      check: {
        check: "within-budget",
        drillId: "normal-day",
        monthlyUsd: 4_000,
      },
    },
  ],
  hints: [
    {
      title: "Where does the time go?",
      body: "A redirect reads a link that never changes after it is made. Reading it from the database every time spends the database on the same few rows, over and over.",
      cost: 5,
    },
    {
      title: "Keep hot links close",
      body: "Put a cache in front of the database for reads, with a high hit ratio. Size the database for the moment the cache is empty, not only for the misses of a normal day.",
      cost: 10,
    },
    {
      title: "Lose the primary without losing the service",
      body: "Give the database a replica and turn on automatic failover, so a lost primary is replaced in seconds. Replicas also carry reads while the cache warms up again.",
      cost: 15,
    },
  ],
  interview: {
    opening:
      "Hi! Today let's design a URL shortener, something like bit.ly. Before you draw anything: what would you like to know about how it is used?",
    facts: [
      {
        topic: "How long a link lives",
        answer:
          "Forever by default. A creator can set an expiry date, after which the link answers 404.",
      },
      {
        topic: "Custom aliases",
        answer:
          "Yes, optional. An alias must be unique; a taken one is refused, not overwritten.",
      },
      {
        topic: "Traffic",
        answer:
          "About 10,000 requests a second at a normal time, 95 % of them redirects. A viral link can bring four times that for a few minutes.",
      },
      {
        topic: "Link length and alphabet",
        answer:
          "Seven characters of letters and digits are enough for years of links.",
      },
      {
        topic: "Redirect status",
        answer:
          "302, so every click reaches us and can be counted. Click counts may lag by a minute and must never slow a redirect down.",
      },
      {
        topic: "Storage",
        answer:
          "About 500 bytes a link, kept for at least five years. About 500 links are created a second.",
      },
      {
        topic: "Users and regions",
        answer:
          "Users are global, but one region is fine for this interview. Anonymous users can create links; there is no sign-in to design.",
      },
      {
        topic: "Latency and availability",
        answer:
          "A redirect within 200 ms at p99, and 99.9 % of requests must succeed, including while the database fails over.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on what the service does and how much traffic it takes, before any boxes are drawn.",
      },
      {
        id: "high-level",
        minutes: 15,
        goal: "A design that serves redirects and creations end to end, with its API and data model.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Make the read path fast under a viral link and keep the service up when the database primary fails.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Summarise the design, its trade-offs and what would change at ten times the scale.",
      },
    ],
    rubric: [
      {
        key: "clarifies-requirements",
        dimension: "requirements",
        title: "Clarifies the requirements before designing",
        signals: [
          "Asks about traffic and the read to write ratio",
          "Asks about expiry, custom aliases or analytics",
          "States which requirements they are designing for",
        ],
        weight: 15,
      },
      {
        key: "estimates-capacity",
        dimension: "requirements",
        title: "Estimates capacity and storage",
        signals: [
          "Turns the traffic into requests a second for reads and writes",
          "Estimates the storage for years of links",
          "Uses the estimates to size the design",
        ],
        weight: 10,
      },
      {
        key: "designs-the-core",
        dimension: "design",
        title: "Designs the API, the key generation and the data model",
        signals: [
          "Defines create and redirect endpoints",
          "Explains how short keys are generated without collisions",
          "Chooses a store and a schema for links, and says why",
        ],
        weight: 20,
      },
      {
        key: "scales-the-read-path",
        dimension: "scaling",
        title: "Scales the read path",
        signals: [
          "Caches redirects and reasons about the hit ratio",
          "Plans for a viral link that multiplies the traffic",
          "Keeps click counting off the redirect path",
        ],
        weight: 20,
      },
      {
        key: "survives-failures",
        dimension: "reliability",
        title: "Keeps the service up when parts fail",
        signals: [
          "Removes single points of failure on the request path",
          "Replicates the database and plans its failover",
          "Explains what users see while a failover happens",
        ],
        weight: 20,
      },
      {
        key: "communicates",
        dimension: "communication",
        title: "Explains trade-offs and responds to challenges",
        signals: [
          "Thinks aloud and keeps the design and the explanation in step",
          "Names the trade-off behind each choice",
          "Changes the design when a drill or a question shows a problem",
        ],
        weight: 15,
      },
    ],
    drillIds: ["normal-day", "primary-fails"],
  },
  reference: {
    notes:
      "A balancer in front of a stateless service with room for the viral peak. Redirects read through a cache with a 90 % hit ratio; creations write to a sharded primary with automatic failover and two read replicas, which also carry the reads when the cache is empty.",
    graph: graph(
      [
        users(),
        node("lb", "load-balancer", "Load balancer", { capacityRps: 60_000 }),
        node("api", "service", "Shortener API", {
          replicas: 24,
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
        edge("lb", "api", "sync-call", { retries: 1 }),
        edge("api", "cache", "read", { retries: 1 }),
        edge("cache", "db", "read", { retries: 1 }),
        edge("api", "db", "write", { retries: 1 }),
        edge("db", "replica-a", "replication"),
        edge("db", "replica-b", "replication"),
      ],
    ),
  },
};
