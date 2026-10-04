import type { ProblemContentInput } from "../schema";
import { edge, graph, node, region, within } from "./build";

const people = () =>
  node("people", "client", "People", { rps: 10_000, readRatio: 0.6 });
const push = () =>
  node("push", "external-api", "Push provider", {
    rateLimitRps: 10_000,
    errorRate: 0.01,
    baseLatencyMs: 120,
  });

const regionalSide = (id: "eu" | "us", label: string) => [
  within(id, node(`lb-${id}`, "load-balancer", `Balancer ${label}`)),
  within(
    id,
    node(`api-${id}`, "service", `Chat API ${label}`, {
      replicas: 8,
      capacityRpsPerReplica: 1_500,
    }),
  ),
  within(id, node(`events-${id}`, "stream", `Messages ${label}`)),
  within(
    id,
    node(`delivery-${id}`, "worker", `Delivery ${label}`, {
      replicas: 3,
      capacityMsgPerReplica: 1_000,
    }),
  ),
];

const regionalEdges = (id: "eu" | "us") => [
  edge("dns", `lb-${id}`, "sync-call", { share: 0.5 }),
  edge(`lb-${id}`, `api-${id}`, "sync-call", { retries: 1 }),
  edge(`api-${id}`, "db", "read", { retries: 1 }),
  edge(`api-${id}`, "db", "write", { retries: 1 }),
  edge(`api-${id}`, `events-${id}`, "write", { retries: 1 }),
  edge(`events-${id}`, `delivery-${id}`, "async-message"),
  edge(`delivery-${id}`, "push", "sync-call", { retries: 1 }),
];

export const chat: ProblemContentInput = {
  slug: "chat",
  title: "Team chat across regions",
  track: "system-design",
  difficulty: "hard",
  tags: ["multi-region", "failover", "streams", "dns"],
  summary:
    "Run a team chat for users in Europe and America that keeps working when a whole region goes dark.",
  statement: `Design the messaging backend of a team chat app used on both sides of the Atlantic.

**What it does**

- People send messages to their channels and load the history of a channel.
- Everyone in a channel gets a push notification for each new message.

**How it is used**

- 10,000 requests a second, half from Europe and half from America: 60 % load history, 40 % send a message.
- A message should be stored and acknowledged within 300 ms at p99, and 99.9 % of requests must succeed.
- A launch or an outage elsewhere can double the traffic for a few minutes.

**What to watch**

- A whole cloud region can go down. The chat must be back for everyone within minutes, without losing its history.
- A call from one region to another adds about 70 ms.
- Push notifications go through a provider that can go down on its own; that must not stop people from chatting.

The *People* client is already on the canvas. Build what it talks to.`,
  baseline: graph([people()]),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description: "10,000 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { maxP99Ms: 300, minAvailability: 0.999, maxEndBacklog: 1_000 },
    },
    {
      id: "region-down",
      title: "The region with the database primary goes down",
      description:
        "The whole region that holds the primary database fails one minute in and stays down. Everyone must be chatting again by the end.",
      visibility: "public",
      durationSeconds: 300,
      faults: [
        {
          kind: "region-down",
          select: { nodeKind: "sql-database", role: "primary" },
          at: 60,
        },
      ],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { endAvailability: 0.999 },
    },
    {
      id: "busy-hour",
      title: "Twice the usual traffic",
      visibility: "hidden",
      durationSeconds: 600,
      traffic: [
        { at: 60, multiplier: 2 },
        { at: 240, multiplier: 1 },
      ],
      slo: { p99Ms: 400, availability: 0.99 },
      expect: { maxP99Ms: 400, minAvailability: 0.99, maxEndBacklog: 0 },
    },
    {
      id: "push-down",
      title: "The push provider goes down",
      visibility: "hidden",
      durationSeconds: 300,
      faults: [
        {
          kind: "node-down",
          select: { nodeKind: "external-api" },
          at: 60,
          until: 240,
        },
      ],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { minAvailability: 0.999 },
    },
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Serves a normal day within the SLO",
      weight: 20,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "survives-losing-a-region",
      title: "Comes back for everyone after losing a region",
      weight: 25,
      check: { check: "drill-passes", drillId: "region-down" },
    },
    {
      key: "absorbs-a-busy-hour",
      title: "Absorbs twice the usual traffic",
      weight: 10,
      check: { check: "drill-passes", drillId: "busy-hour" },
    },
    {
      key: "chats-without-push",
      title: "Keeps chatting while the push provider is down",
      weight: 10,
      check: { check: "drill-passes", drillId: "push-down" },
    },
    {
      key: "routes-with-dns",
      title: "Routes people to regions with DNS",
      weight: 5,
      check: { check: "has-node-kind", nodeKind: "dns" },
    },
    {
      key: "keeps-push-off-the-request-path",
      title: "Keeps the push provider off the request path",
      weight: 10,
      check: { check: "no-lint", lint: "sync-third-party" },
    },
    {
      key: "no-single-point-of-failure",
      title: "Has no single point of failure",
      weight: 5,
      check: { check: "no-lint", lint: "spof-critical-path" },
    },
    {
      key: "survives-unseen-faults",
      title: "Survives faults drawn from the design itself",
      weight: 15,
      check: { check: "chaos-coverage", min: 1 },
    },
  ],
  hints: [
    {
      title: "What does a region failure take with it?",
      body: "Everything placed in the lost region stops at once: its servers, its streams and any database there. A design with no regions counts as one place.",
      cost: 5,
    },
    {
      title: "Run the whole path in both regions",
      body: "Put a balancer, the API, a stream and delivery workers in each region, and route people with DNS. Size each region to carry all the traffic alone.",
      cost: 10,
    },
    {
      title: "Let the data survive",
      body: "Keep a replica of the database in the other region with automatic failover. It is promoted when the primary's region goes, and DNS moves people once their cached answer expires.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "Both regions run the full request path, and DNS sends each person to one by latency. Messages live in one SQL primary in Europe with automatic failover and a replica in each region; American writes pay the 70 ms hop and still fit the budget. Each region appends messages to its own stream and delivers pushes from its own workers, so losing a region loses none of the other's delivery. When Europe goes down, DNS moves everyone to America once the TTL runs out, the American replica is promoted, and each region is sized to carry all the traffic on its own.",
    graph: graph(
      [
        people(),
        node("dns", "dns", "DNS", { policy: "latency", ttlSeconds: 60 }),
        ...regionalSide("eu", "EU"),
        ...regionalSide("us", "US"),
        within(
          "eu",
          node("db", "sql-database", "Messages", {
            failover: "automatic",
            shards: 10,
          }),
        ),
        within("eu", node("replica-eu", "sql-database", "Messages replica EU")),
        within("us", node("replica-us", "sql-database", "Messages replica US")),
        push(),
      ],
      [
        edge("people", "dns", "sync-call"),
        ...regionalEdges("eu"),
        ...regionalEdges("us"),
        edge("db", "replica-eu", "replication"),
        edge("db", "replica-us", "replication"),
      ],
      [region("eu", "Europe"), region("us", "America")],
    ),
  },
};
