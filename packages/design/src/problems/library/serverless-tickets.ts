import type { ProblemContentInput } from "../schema";
import { edge, graph, node, pooled } from "./build";

const buyers = () =>
  node("buyers", "client", "Buyers", { rps: 1_000, readRatio: 0.9 });

const functions = (warm = 75) =>
  node("functions", "service", "Ticket functions", {
    replicas: warm,
    capacityRpsPerReplica: 20,
    baseLatencyMs: 50,
    autoscale: {
      enabled: true,
      min: warm,
      max: 3_000,
      targetUtilisation: 0.7,
    },
  });

const tickets = (props: Record<string, unknown> = {}) =>
  node("tickets", "sql-database", "Tickets", props);

const onSale = [
  { at: 60, multiplier: 1.5 },
  { at: 80, multiplier: 2 },
  { at: 100, multiplier: 3 },
  { at: 120, multiplier: 4 },
  { at: 140, multiplier: 6 },
  { at: 160, multiplier: 8 },
  { at: 180, multiplier: 11 },
  { at: 200, multiplier: 15 },
  { at: 220, multiplier: 20 },
];

export const serverlessTickets: ProblemContentInput = {
  slug: "serverless-tickets",
  title: "Ticket sales on serverless functions",
  track: "system-design",
  difficulty: "medium",
  tags: ["serverless", "connection-pooling", "autoscaling"],
  summary:
    "Keep a ticket shop's database answering when a big on-sale scales its functions into the thousands.",
  statement: `Design the backend of a ticket shop whose API runs as serverless functions.

**What it does**

- Buyers browse events and seat maps, and buy tickets.
- Events, seats and orders live in one PostgreSQL database.

**How it is used**

- 1,000 requests a second on a normal day, 90 % of them reads.
- When a big concert goes on sale, traffic climbs to twenty times that over about three minutes and stays there.
- 99.9 % of requests must succeed once the functions have caught up, with p99 under 400 ms.

**What to watch**

- A function instance handles one request at a time, 20 a second. The platform keeps 75 warm and runs up to 3,000 as traffic needs; keeping more warm costs more.
- Every instance opens its own connection to the database when it starts and keeps it.
- The database accepts 1,000 connections.

The *Buyers* client, the *Ticket functions* and the *Tickets* database are on the canvas, set up as described. Connect them and add what they need.`,
  baseline: graph([buyers(), functions(), tickets()]),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description: "1,000 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 400, availability: 0.999 },
      expect: { maxP99Ms: 400, minAvailability: 0.999 },
    },
    {
      id: "on-sale",
      title: "A big concert goes on sale",
      description:
        "Traffic climbs to twenty times the usual over about three minutes and holds. The functions take a while to catch up, but once they have, every request must succeed again.",
      visibility: "public",
      durationSeconds: 480,
      traffic: onSale,
      slo: { p99Ms: 400, availability: 0.9 },
      expect: {
        minAvailability: 0.9,
        endAvailability: 0.999,
        endMaxP99Ms: 400,
        forbid: ["connections-exhausted"],
      },
    },
    {
      id: "primary-fails",
      title: "The database primary fails during the sale",
      visibility: "hidden",
      durationSeconds: 480,
      traffic: onSale,
      faults: [
        {
          kind: "node-down",
          select: { nodeKind: "sql-database", role: "primary" },
          at: 300,
        },
      ],
      slo: { p99Ms: 400, availability: 0.9 },
      expect: { endAvailability: 0.999 },
    },
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Handles a normal day within the SLO",
      weight: 20,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "survives-the-on-sale",
      title: "Keeps serving once the functions have scaled out",
      weight: 35,
      check: { check: "drill-passes", drillId: "on-sale" },
    },
    {
      key: "pools-connections",
      title: "Pools the functions' connections in front of the database",
      weight: 25,
      check: {
        check: "has-node-kind",
        nodeKind: "connection-pooler",
        drillId: "on-sale",
      },
    },
    {
      key: "recovers-from-primary-failure",
      title: "Recovers when the database primary fails",
      weight: 20,
      check: { check: "drill-passes", drillId: "primary-fails" },
    },
  ],
  hints: [
    {
      title: "Count the connections",
      body: "20,000 requests a second at 20 an instance, kept at 70 % busy, is over 1,400 instances, and the platform adds half again at a time, so expect nearly 2,000. Each holds a connection; the database accepts 1,000.",
      cost: 5,
    },
    {
      title: "Put a pooler in between",
      body: "A connection pooler such as RDS Proxy or PgBouncer accepts every function's connection and lends a few of its own to them in turn, one request at a time.",
      cost: 10,
    },
    {
      title: "Size the pooler's own pool",
      body: "A query takes about 5 ms, so one server connection carries about 200 a second. 20,000 a second needs at least a hundred, and room above that.",
      cost: 10,
    },
  ],
  reference: {
    notes:
      "A hundred function instances stay warm, as provisioned concurrency, so a normal day runs at half their capacity. The functions call a connection pooler, each instance with a pool of one, and the pooler holds 200 connections to the database: at about 5 ms a query that carries 40,000 requests a second, twice the peak, while the nearly 2,000 instances at the peak stay far below the 10,000 client connections it accepts. The database is sized for the peak's 18,000 reads and 2,000 writes, with automatic failover to a replica, so when the primary fails the pooler reaches the promoted replica 30 s later. Raising the database's limit to 2,000 would pass the sale too, but every new instance would still open a connection of its own, and the next larger sale would need a larger limit again.",
    graph: graph(
      [
        buyers(),
        functions(100),
        node("pooler", "connection-pooler", "Pooler"),
        tickets({
          readCapacityRps: 30_000,
          writeCapacityRps: 3_000,
          failover: "automatic",
        }),
        node("replica", "sql-database", "Tickets replica"),
      ],
      [
        edge("buyers", "functions", "sync-call"),
        pooled(edge("functions", "pooler", "sync-call"), 1),
        pooled(edge("pooler", "tickets", "sync-call"), 200),
        edge("tickets", "replica", "replication"),
      ],
    ),
  },
};
