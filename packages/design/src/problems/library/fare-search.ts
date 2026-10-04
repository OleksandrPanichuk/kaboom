import type { ProblemContentInput } from "../schema";
import { edge, graph, node, region, within } from "./build";

const travellers = () =>
  node("travellers", "client", "Travellers", { rps: 30_000, readRatio: 0.95 });

const REGIONS = [
  { id: "eu", label: "EU", name: "Europe" },
  { id: "us", label: "US", name: "America" },
  { id: "ap", label: "AP", name: "Asia" },
] as const;

type RegionId = (typeof REGIONS)[number]["id"];

const regionalSide = (id: RegionId, label: string) => [
  within(id, node(`lb-${id}`, "load-balancer", `Balancer ${label}`)),
  within(
    id,
    node(`search-${id}`, "service", `Fare search ${label}`, {
      replicas: 90,
      capacityRpsPerReplica: 200,
    }),
  ),
  within(
    id,
    node(`cache-${id}`, "cache", `Fare cache ${label}`, {
      hitRatio: 0.9,
      readCapacityRps: 50_000,
    }),
  ),
];

const regionalEdges = (id: RegionId) => [
  edge("dns", `lb-${id}`, "sync-call", { share: 1 / 3 }),
  edge(`lb-${id}`, `search-${id}`, "sync-call", { retries: 1 }),
  edge(`search-${id}`, `cache-${id}`, "read", { retries: 1 }),
  edge(`cache-${id}`, "db", "read", { retries: 1 }),
  edge(`search-${id}`, "db", "write", { retries: 1 }),
];

export const fareSearch: ProblemContentInput = {
  slug: "fare-search",
  title: "Fare search that loses a region",
  track: "system-design",
  difficulty: "hard",
  tags: ["multi-region", "cost", "capacity", "chaos"],
  summary:
    "Run a compute-heavy fare search in several regions so that losing any one of them costs nothing, for under $17,000 a month.",
  statement: `Design the fare search for a travel site with travellers all over the world.

**What it does**

- A traveller searches fares between two cities and dates; pricing each search takes real computation.
- Travellers save searches and set price alerts.

**How it is used**

- 30,000 requests a second, 95 % of them searches; the rest save something.
- A search answers within 300 ms at p99, and 99.9 % of requests succeed.
- An evening peak brings 30 % more traffic for a few minutes.

**What to watch**

- One search replica prices about 200 searches a second, and it costs $56 a month.
- Any cloud region can go down, not only the one with the database. Besides the drills, the tests take each region you draw away in turn, and travellers must be served again within a minute or so.
- The whole thing must run for **under $17,000 a month**. Every region you add carries a share of the traffic and must carry more when another goes down: work out how much more before you size it.
- A call from one region to another adds about 70 ms.

The *Travellers* client is already on the canvas. Build what it talks to.`,
  baseline: graph([travellers()]),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description: "30,000 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { maxP99Ms: 300, minAvailability: 0.999, forbid: ["saturated"] },
    },
    {
      id: "primary-region-down",
      title: "The region with the database primary goes down",
      description:
        "The whole region that holds the primary fails one minute in and stays down. Everyone must be searching again by the end.",
      visibility: "public",
      durationSeconds: 300,
      faults: [
        {
          kind: "region-down",
          select: { nodeKind: "sql-database", role: "primary" },
          at: 60,
        },
      ],
      slo: { p99Ms: 400, availability: 0.999 },
      expect: { endAvailability: 0.999 },
    },
    {
      id: "evening-peak",
      title: "The evening peak",
      visibility: "hidden",
      durationSeconds: 360,
      traffic: [
        { at: 60, multiplier: 1.3 },
        { at: 240, multiplier: 1 },
      ],
      slo: { p99Ms: 400, availability: 0.995 },
      expect: { maxP99Ms: 400, minAvailability: 0.995 },
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
      key: "survives-losing-the-primary-region",
      title: "Comes back after losing the region with the primary",
      weight: 15,
      check: { check: "drill-passes", drillId: "primary-region-down" },
    },
    {
      key: "absorbs-the-evening-peak",
      title: "Absorbs the evening peak",
      weight: 10,
      check: { check: "drill-passes", drillId: "evening-peak" },
    },
    {
      key: "routes-with-dns",
      title: "Routes travellers to regions with DNS",
      weight: 5,
      check: { check: "has-node-kind", nodeKind: "dns" },
    },
    {
      key: "survives-losing-any-region",
      title:
        "Survives losing any region, and anything else drawn from the design",
      weight: 25,
      check: { check: "chaos-coverage", min: 1 },
    },
    {
      key: "fits-the-budget",
      title: "Runs for under $17,000 a month",
      weight: 25,
      check: {
        check: "within-budget",
        drillId: "normal-day",
        monthlyUsd: 17_000,
      },
    },
  ],
  hints: [
    {
      title: "Keeping searches local",
      body: "A cache in each region answers most searches without crossing to the database's region, so only misses and saves pay the 70 ms hop.",
      cost: 10,
    },
    {
      title: "What a lost region leaves behind",
      body: "With DNS splitting by latency, a lost region's travellers move to the regions left once the TTL runs out. With two regions, the one left carries everything; with three, each carries half.",
      cost: 10,
    },
    {
      title: "Counting replicas",
      body: "30,000 requests at 200 a replica is 150 replicas busy. Two regions that can each carry all of it need about 340; three that can each carry half need about 270.",
      cost: 15,
    },
  ],
  interview: {
    opening:
      "Hi! Today we're designing the fare search for a travel site used all over the world. Pricing a search is expensive, and any region can go down. What would you like to know before you start?",
    facts: [
      {
        topic: "Traffic",
        answer:
          "About 30,000 requests a second, 95 % searches and 5 % saved searches and price alerts. The evening peak adds 30 % for a few minutes.",
      },
      {
        topic: "Cost of a search",
        answer:
          "One search replica prices about 200 searches a second and costs $56 a month.",
      },
      {
        topic: "Freshness",
        answer: "A fare may be a minute old in search results.",
      },
      {
        topic: "Regions",
        answer:
          "Travellers are spread evenly over Europe, America and Asia. Any region can go down; a call between regions adds about 70 ms.",
      },
      {
        topic: "Budget",
        answer: "Everything must run for under $17,000 a month.",
      },
      {
        topic: "Latency and availability",
        answer:
          "A search answers within 300 ms at p99, and 99.9 % of requests succeed.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on the traffic, what a search costs, the regions and the budget.",
      },
      {
        id: "high-level",
        minutes: 15,
        goal: "A design that serves searches near travellers and keeps saved searches in one place.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Size the regions so that losing any one of them costs nothing, within the budget.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Summarise the design, where the money goes and what happens when each region is lost.",
      },
    ],
    rubric: [
      {
        key: "clarifies-requirements",
        dimension: "requirements",
        title: "Clarifies the traffic, the regions and the budget",
        signals: [
          "Asks how travellers are spread over the world",
          "Asks what a search costs to compute",
          "Asks which regions can fail",
        ],
        weight: 15,
      },
      {
        key: "designs-the-core",
        dimension: "design",
        title: "Serves searches near travellers",
        signals: [
          "Routes travellers to a nearby region with DNS",
          "Caches fares in each region",
          "Keeps saved searches in one database with failover",
        ],
        weight: 20,
      },
      {
        key: "sizes-for-a-lost-region",
        dimension: "scaling",
        title: "Sizes each region for the loss of another",
        signals: [
          "Works out the share each region carries when one is lost",
          "Compares two regions with three by cost",
          "Explains the evening peak's headroom",
        ],
        weight: 25,
      },
      {
        key: "survives-failures",
        dimension: "reliability",
        title: "Survives losing any region",
        signals: [
          "Explains what travellers see for one TTL after a region is lost",
          "Fails the database over to another region",
          "Removes single points of failure",
        ],
        weight: 25,
      },
      {
        key: "communicates",
        dimension: "communication",
        title: "Explains trade-offs and responds to challenges",
        signals: [
          "Puts a price on each option",
          "Changes the design when a failure or a cost is pointed out",
        ],
        weight: 15,
      },
    ],
    drillIds: ["normal-day", "primary-region-down", "evening-peak"],
  },
  reference: {
    notes:
      "Three regions, each with a balancer, ninety search replicas and a fare cache, and DNS splitting travellers by latency. A region carries a third of the traffic on a normal day and half once another is lost, so ninety replicas are 56 % busy normally and 83 % busy after a loss. Saved searches live in one SQL primary in Europe with automatic failover and a replica in each other region. Two regions that could each carry everything would need about 340 replicas and cost about $19,000 a month; three need 270 and cost about $15,500.",
    graph: graph(
      [
        travellers(),
        node("dns", "dns", "DNS", { policy: "latency", ttlSeconds: 30 }),
        ...REGIONS.flatMap(({ id, label }) => regionalSide(id, label)),
        within(
          "eu",
          node("db", "sql-database", "Saved searches", {
            failover: "automatic",
            readCapacityRps: 10_000,
            writeCapacityRps: 4_000,
          }),
        ),
        within("us", node("replica-us", "sql-database", "Replica US")),
        within("ap", node("replica-ap", "sql-database", "Replica AP")),
      ],
      [
        edge("travellers", "dns", "sync-call"),
        ...REGIONS.flatMap(({ id }) => regionalEdges(id)),
        edge("db", "replica-us", "replication"),
        edge("db", "replica-ap", "replication"),
      ],
      REGIONS.map(({ id, name }) => region(id, name)),
    ),
  },
};
