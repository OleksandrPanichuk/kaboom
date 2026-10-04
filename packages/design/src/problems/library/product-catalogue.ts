import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const shoppers = () =>
  node("shoppers", "client", "Shoppers", { rps: 20_000, readRatio: 0.98 });

export const productCatalogue: ProblemContentInput = {
  slug: "product-catalogue",
  title: "Product catalogue on a budget",
  track: "system-design",
  difficulty: "medium",
  tags: ["cost", "caching", "read-heavy"],
  summary:
    "Serve a shop's product pages at 20,000 requests a second for under $2,000 a month.",
  statement: `Design the API behind a shop's product pages, for a team that has to pay for it.

**What it does**

- A shopper opens a product: its name, price, stock and description.
- Merchants update prices and stock all day.

**How it is used**

- 20,000 requests a second, 98 % of them reads; the rest are updates.
- A sale can triple the traffic for a few minutes.
- A product page should answer within 150 ms at p99, and 99.9 % of requests must succeed.

**What to watch**

- The whole thing must run for **under $2,000 a month**. The editor's top bar shows what your design would cost.
- A price may be up to 30 seconds stale on a product page.
- Services billed per request are cheap at a trickle and expensive at this volume.

The *Shoppers* client is already on the canvas. Build what it talks to.`,
  baseline: graph([shoppers()]),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description: "20,000 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 150, availability: 0.999 },
      expect: { maxP99Ms: 150, minAvailability: 0.999, forbid: ["saturated"] },
    },
    {
      id: "sale",
      title: "A sale starts",
      description:
        "Traffic builds to three times the usual over a minute and a half, holds, then drops back. A short dip is fine, but the shop must be back to normal as soon as the sale ends.",
      visibility: "public",
      durationSeconds: 360,
      traffic: [
        { at: 60, multiplier: 1.5 },
        { at: 90, multiplier: 2 },
        { at: 120, multiplier: 2.5 },
        { at: 150, multiplier: 3 },
        { at: 270, multiplier: 1 },
      ],
      slo: { p99Ms: 400, availability: 0.98 },
      expect: {
        minAvailability: 0.98,
        endAvailability: 0.999,
        endMaxP99Ms: 150,
      },
    },
    {
      id: "cache-flush",
      title: "The cache is emptied",
      visibility: "hidden",
      durationSeconds: 300,
      faults: [{ kind: "cache-flush", select: { nodeKind: "cache" }, at: 60 }],
      slo: { p99Ms: 400, availability: 0.95 },
      expect: { minAvailability: 0.95, endAvailability: 0.999 },
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
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Handles a normal day within the SLO",
      weight: 20,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "rides-out-a-sale",
      title: "Rides out a sale and recovers when it ends",
      weight: 15,
      check: { check: "drill-passes", drillId: "sale" },
    },
    {
      key: "survives-an-empty-cache",
      title: "Survives an empty cache",
      weight: 10,
      check: { check: "drill-passes", drillId: "cache-flush" },
    },
    {
      key: "recovers-from-primary-failure",
      title: "Recovers when the database primary fails",
      weight: 10,
      check: { check: "drill-passes", drillId: "primary-fails" },
    },
    {
      key: "caches-the-catalogue",
      title: "Answers most product reads from a cache",
      weight: 10,
      check: {
        check: "serves-reads",
        drillId: "normal-day",
        nodeKind: "cache",
        minShare: 0.85,
      },
    },
    {
      key: "fits-the-budget",
      title: "Runs for under $2,000 a month",
      weight: 20,
      check: {
        check: "within-budget",
        drillId: "normal-day",
        monthlyUsd: 2_000,
      },
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
      title: "Where the money goes",
      body: "Open the top bar's estimate and the inspector's cost row. A CDN or a managed gateway bills every request; at 20,000 a second that is tens of thousands of dollars a month.",
      cost: 10,
    },
    {
      title: "The cheapest read",
      body: "A cache node answers a hundred thousand reads a second for about $150 a month, and a price may be 30 seconds stale. The database then only sees the misses and the updates.",
      cost: 15,
    },
    {
      title: "Room for the sale",
      body: "Let the API autoscale instead of running for the peak all month, and give the database enough write capacity for three times the updates.",
      cost: 15,
    },
  ],
  interview: {
    opening:
      "Hi! Today we're designing the API behind a shop's product pages, and the team that runs it has a tight budget. What would you like to know before you start?",
    facts: [
      {
        topic: "Traffic",
        answer:
          "About 20,000 requests a second, 98 % reads of a product and 2 % updates of price or stock.",
      },
      {
        topic: "Sales",
        answer:
          "A sale can triple the traffic for a few minutes. A short dip is acceptable; the shop must be back to normal as soon as it ends.",
      },
      {
        topic: "Freshness",
        answer: "A price on a product page may be up to 30 seconds old.",
      },
      {
        topic: "Budget",
        answer:
          "Everything must run for under $2,000 a month, at on-demand prices in one AWS region.",
      },
      {
        topic: "Latency and availability",
        answer:
          "A product page answers within 150 ms at p99, and 99.9 % of requests succeed.",
      },
      {
        topic: "Catalogue size",
        answer:
          "About two million products, a few kilobytes each. The popular ones are a small fraction of reads' targets.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on the traffic, the freshness the shop accepts and the budget.",
      },
      {
        id: "high-level",
        minutes: 15,
        goal: "A design that serves product reads and updates end to end, and what it costs.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Fit the budget while surviving a sale, an empty cache and a failed primary.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Summarise the design, where the money goes and what changes at ten times the traffic.",
      },
    ],
    rubric: [
      {
        key: "clarifies-requirements",
        dimension: "requirements",
        title: "Clarifies the requirements and the budget",
        signals: [
          "Asks about the read and update mix",
          "Asks how stale a price may be",
          "Asks what the budget covers",
        ],
        weight: 15,
      },
      {
        key: "estimates-cost",
        dimension: "requirements",
        title: "Puts a price on the design",
        signals: [
          "Turns the traffic into requests a month",
          "Notices which services bill per request",
          "Compares the design's cost with the budget",
        ],
        weight: 15,
      },
      {
        key: "designs-the-core",
        dimension: "design",
        title: "Designs the read and update paths",
        signals: [
          "Serves reads from a cache in front of the database",
          "Keeps updates on the database",
          "Explains how a stale price ages out",
        ],
        weight: 20,
      },
      {
        key: "scales-for-a-sale",
        dimension: "scaling",
        title: "Handles a sale without paying for it all month",
        signals: [
          "Autoscales the API",
          "Sizes the database for three times the updates",
          "Explains what shoppers see while it scales",
        ],
        weight: 20,
      },
      {
        key: "survives-failures",
        dimension: "reliability",
        title: "Keeps the shop up when parts fail",
        signals: [
          "Survives an empty cache without the database falling over",
          "Fails the primary over to a replica",
          "Removes single points of failure",
        ],
        weight: 15,
      },
      {
        key: "communicates",
        dimension: "communication",
        title: "Explains trade-offs and responds to challenges",
        signals: [
          "Says what each part costs and why it is worth it",
          "Changes the design when a cost or a failure is pointed out",
        ],
        weight: 15,
      },
    ],
    drillIds: ["normal-day", "sale", "cache-flush", "primary-fails"],
  },
  reference: {
    notes:
      "A balancer in front of an API that autoscales from fourteen replicas, so the sale is paid for only while it lasts. Reads go through a cache with a 95 % hit ratio, one node of it, which answers the sale's reads too; the database sees the misses and the updates, with a replica and automatic failover. About $1,700 a month. A CDN would answer the same reads, but at 20,000 requests a second it bills about $39,000 a month, and a SQL primary sized to take every read itself costs about $1,400 alone, which takes the design over the budget.",
    graph: graph(
      [
        shoppers(),
        node("lb", "load-balancer", "Load balancer", { capacityRps: 100_000 }),
        node("api", "service", "Catalogue API", {
          replicas: 14,
          capacityRpsPerReplica: 2_500,
          autoscale: {
            enabled: true,
            min: 14,
            max: 42,
            targetUtilisation: 0.7,
          },
        }),
        node("cache", "cache", "Product cache", {
          hitRatio: 0.95,
          readCapacityRps: 100_000,
        }),
        node("db", "sql-database", "Products", {
          failover: "automatic",
          readCapacityRps: 5_000,
          writeCapacityRps: 2_000,
        }),
        node("replica", "sql-database", "Products replica"),
      ],
      [
        edge("shoppers", "lb", "sync-call"),
        edge("lb", "api", "sync-call", { retries: 1 }),
        edge("api", "cache", "read", { retries: 1 }),
        edge("cache", "db", "read", { retries: 1 }),
        edge("api", "db", "write", { retries: 1 }),
        edge("db", "replica", "replication"),
      ],
    ),
  },
};
