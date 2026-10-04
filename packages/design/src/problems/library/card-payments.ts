import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const checkout = () =>
  node("checkout", "client", "Checkout", { rps: 1_500, readRatio: 0 });

const bank = () =>
  node("bank", "external-api", "Card network", {
    rateLimitRps: 2_000,
    errorRate: 0.01,
  });

export const cardPayments: ProblemContentInput = {
  slug: "card-payments",
  title: "Card payments that retry with care",
  track: "system-design",
  difficulty: "hard",
  tags: ["retries", "external-api", "reliability"],
  summary:
    "Authorise card payments through a card network that fails now and then, without retries turning its bad minutes into an outage.",
  statement: `Design the service that authorises card payments for a shop's checkout.

**What it does**

- Checkout asks to authorise a payment and waits for the answer; the service asks the card network and records the result.

**How it is used**

- 1,500 payments a second at the peak of the day.
- 99.9 % of payments must be authorised, within 800 ms at p99.

**The card network**

- Takes up to 2,000 calls a second and turns away the rest.
- Fails about 1 % of calls even on a good day, and now and then fails one in ten for a couple of minutes.
- On a bad day it lowers its limit for a few minutes, and anything above it is refused.

**What to watch**

- A retry rescues a payment from a call that failed by chance, and it is one more call on a network that may already be refusing them.
- Retries at several layers multiply: three tries at each of two layers is nine calls for one payment.

The *Checkout* client and the *Card network* are already on the canvas. Build what goes between them.`,
  baseline: graph([checkout(), bank()]),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description:
        "1,500 payments a second for five minutes, with the network failing 1 % of calls.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 800, availability: 0.999 },
      expect: { maxP99Ms: 800, minAvailability: 0.999, forbid: ["saturated"] },
    },
    {
      id: "network-wobbles",
      title: "The network has a bad couple of minutes",
      description:
        "One call in ten fails for two minutes. Most payments should still go through.",
      visibility: "public",
      durationSeconds: 300,
      faults: [
        {
          kind: "error-rate",
          select: { nodeKind: "external-api" },
          at: 60,
          until: 180,
          rate: 0.1,
        },
      ],
      slo: { p99Ms: 1_500, availability: 0.98 },
      expect: { minAvailability: 0.98, endAvailability: 0.999 },
    },
    {
      id: "network-throttles",
      title: "The network lowers its limit",
      description:
        "For three minutes the network takes only 70 % of its usual calls. Payments above that will fail, but retries must not pile onto it, and everything must work again when it recovers.",
      visibility: "public",
      durationSeconds: 360,
      faults: [
        {
          kind: "capacity",
          select: { nodeKind: "external-api" },
          at: 60,
          until: 240,
          factor: 0.7,
        },
      ],
      slo: { p99Ms: 1_500, availability: 0 },
      expect: { endAvailability: 0.999, forbid: ["retry-storm"] },
    },
    {
      id: "network-down",
      title: "The network goes down for a minute",
      visibility: "hidden",
      durationSeconds: 300,
      faults: [
        {
          kind: "node-down",
          select: { nodeKind: "external-api" },
          at: 60,
          until: 120,
        },
      ],
      slo: { p99Ms: 1_500, availability: 0 },
      expect: { endAvailability: 0.999 },
    },
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Authorises a normal day's payments within the SLO",
      weight: 20,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "rides-out-a-wobble",
      title: "Rides out a bad couple of minutes",
      weight: 20,
      check: { check: "drill-passes", drillId: "network-wobbles" },
    },
    {
      key: "does-not-pile-on",
      title: "Does not pile retries onto a network that is refusing calls",
      weight: 25,
      check: { check: "drill-passes", drillId: "network-throttles" },
    },
    {
      key: "recovers-after-an-outage",
      title: "Works again once the network comes back",
      weight: 10,
      check: { check: "drill-passes", drillId: "network-down" },
    },
    {
      key: "no-single-point-of-failure",
      title: "Has no single point of failure",
      weight: 10,
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
      title: "Why one retry",
      body: "With 1 % of calls failing, one retry turns it into 0.01 %, and costs about 1 % more calls. The edge's Retries field sets it.",
      cost: 10,
    },
    {
      title: "Where retries multiply",
      body: "A retry at the balancer repeats the whole request, including the API's own retries to the network. Pick one layer: the balancer's retry also covers an API replica that fails, and the API's covers only the network.",
      cost: 15,
    },
    {
      title: "How many",
      body: "When the network refuses calls, each extra retry adds load it will refuse too. Run the throttling drill with one retry and with three, and compare the findings.",
      cost: 15,
    },
  ],
  interview: {
    opening:
      "Hi! Today we're designing the service that authorises card payments for a shop's checkout, through a card network we don't control. What would you like to know before you start?",
    facts: [
      {
        topic: "Traffic",
        answer: "About 1,500 payments a second at the peak of the day.",
      },
      {
        topic: "The card network",
        answer:
          "It takes up to 2,000 calls a second and fails about 1 % of them on a good day. A call takes about 150 ms.",
      },
      {
        topic: "Bad days",
        answer:
          "Now and then it fails one call in ten for a couple of minutes, and sometimes it lowers its limit to about 70 % for a few minutes.",
      },
      {
        topic: "Idempotency",
        answer:
          "Each payment carries an idempotency key, so the network authorises it once however often it is asked.",
      },
      {
        topic: "Latency and availability",
        answer:
          "99.9 % of payments authorised within 800 ms at p99 on a normal day.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on the traffic, how the network fails and what a payment may wait.",
      },
      {
        id: "high-level",
        minutes: 15,
        goal: "A design that authorises a payment end to end and records it.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Decide where and how often to retry, so a bad minute stays a bad minute.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Summarise the design and how it behaves on each kind of bad day.",
      },
    ],
    rubric: [
      {
        key: "clarifies-requirements",
        dimension: "requirements",
        title: "Clarifies how the network fails",
        signals: [
          "Asks about the network's limit and error rate",
          "Asks whether a retried payment can be charged twice",
          "Asks what a payment may wait",
        ],
        weight: 15,
      },
      {
        key: "designs-the-core",
        dimension: "design",
        title: "Designs the authorisation path",
        signals: [
          "Records each payment and its result",
          "Uses the idempotency key on every call",
          "Keeps the authorisation on the request path, since checkout waits for it",
          "Removes single points of failure",
        ],
        weight: 20,
      },
      {
        key: "retries-with-care",
        dimension: "reliability",
        title: "Retries where it helps and nowhere else",
        signals: [
          "Retries a failed payment once, at one layer",
          "Explains how retries multiply across layers",
          "Explains why retries make a refusing network worse",
        ],
        weight: 30,
      },
      {
        key: "survives-failures",
        dimension: "reliability",
        title: "Recovers from the network's outages",
        signals: [
          "Explains what checkout sees while the network is down",
          "Recovers without a storm of retries once it is back",
        ],
        weight: 20,
      },
      {
        key: "communicates",
        dimension: "communication",
        title: "Explains trade-offs and responds to challenges",
        signals: [
          "Weighs a rescued payment against an extra call",
          "Changes the design when a failure mode is pointed out",
        ],
        weight: 15,
      },
    ],
    drillIds: [
      "normal-day",
      "network-wobbles",
      "network-throttles",
      "network-down",
    ],
  },
  reference: {
    notes:
      "A balancer in front of a payments API with room to lose a replica, which records each payment in a database with a replica and automatic failover. The balancer retries a failed payment once, and nothing below it retries: one retry turns 1 % of failed calls into 0.01 % and a bad couple of minutes into about 1 %, and it covers an API replica that fails as well as the network. A network that has lowered its limit sees at most twice the calls it refuses, not the nine times that three tries at two layers would send. The idempotency key makes the retry safe.",
    graph: graph(
      [
        checkout(),
        node("lb", "load-balancer", "Load balancer"),
        node("api", "service", "Payments API", {
          replicas: 6,
          capacityRpsPerReplica: 500,
        }),
        node("db", "sql-database", "Payments", {
          failover: "automatic",
          writeCapacityRps: 3_000,
        }),
        node("replica", "sql-database", "Payments replica"),
        bank(),
      ],
      [
        edge("checkout", "lb", "sync-call"),
        edge("lb", "api", "sync-call", { retries: 1 }),
        edge("api", "bank", "sync-call", { timeoutMs: 1_000 }),
        edge("api", "db", "write", { retries: 1 }),
        edge("db", "replica", "replication"),
      ],
    ),
  },
};
