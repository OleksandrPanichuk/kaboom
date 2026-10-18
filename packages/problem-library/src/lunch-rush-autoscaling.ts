import { edge, graph, node } from "@repo/design/build";
import type { ProblemContentInput } from "@repo/scoring";

const diners = () =>
  node("diners", "client", "Diners", { rps: 2_000, readRatio: 0.8 });

const front = () => [
  diners(),
  node("ingress", "ingress", "Ingress"),
  node("orders-svc", "k8s-service", "orders"),
];

const database = () =>
  node("db", "sql-database", "Orders DB", {
    readCapacityRps: 20_000,
    writeCapacityRps: 5_000,
  });

const calls = () => [
  edge("diners", "ingress", "sync-call"),
  edge("ingress", "orders-svc", "sync-call"),
  edge("orders-svc", "orders", "sync-call"),
  edge("orders", "db", "read"),
  edge("orders", "db", "write"),
];

export const lunchRushAutoscaling: ProblemContentInput = {
  slug: "lunch-rush-autoscaling",
  title: "Scale for the lunch rush",
  track: "devops",
  difficulty: "medium",
  tags: ["kubernetes", "autoscaling", "capacity", "cost"],
  summary:
    "Serve a lunch rush three times the morning's traffic without paying for the rush all day.",
  statement: `A food-ordering app sizes its orders pods for the busiest hour of the day, and pays for that size around the clock. Make it grow when diners arrive and stay small when they do not.

**What it does**

- Diners browse menus and place orders through an ingress and a Kubernetes service in front of the orders pods, which use one Postgres database.
- One pod handles 500 requests a second.

**How it is used**

- 2,000 requests a second through the morning and the afternoon.
- From noon, traffic climbs over about seven minutes to three times that, and stays there for the lunch hour.
- Now and then a promotion goes out by push notification, and the rush arrives all at once.

**What to watch**

- 99.9 % of requests must succeed outside the rush, and p99 must stay under 300 ms.
- While traffic climbs, at least 99 % must succeed, and once the rush has settled it is back to 99.9 % and 300 ms.
- The cluster's quota allows the orders service 16 pods at most.
- The finance team wants the service to cost no more than $1,200 a month at the morning's traffic, database included.

Last month someone added an autoscaler to cut the bill: it starts at three pods, may grow to thirty, and waits until they are 90 % busy. Mornings have been slow ever since. Change how the service is sized.`,
  baseline: graph(
    [
      ...front(),
      node("orders", "k8s-deployment", "Orders", {
        replicas: 3,
        capacityRpsPerReplica: 500,
        readinessProbe: true,
      }),
      node("autoscaler", "hpa", "Autoscaler", {
        min: 3,
        max: 30,
        targetUtilisation: 0.9,
      }),
      database(),
    ],
    [...calls(), edge("autoscaler", "orders", "scales")],
  ),
  drills: [
    {
      id: "quiet-morning",
      title: "A quiet morning",
      description: "2,000 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { maxP99Ms: 300, minAvailability: 0.999 },
    },
    {
      id: "lunch-rush",
      title: "The lunch rush",
      description:
        "Traffic climbs from 2,000 to 6,000 requests a second over seven minutes and stays there. At least 99 % must succeed throughout, and the service must be back within its SLO by the end, on 16 pods at most.",
      visibility: "public",
      durationSeconds: 900,
      traffic: [
        { at: 60, multiplier: 1.5 },
        { at: 180, multiplier: 2 },
        { at: 300, multiplier: 2.5 },
        { at: 420, multiplier: 3 },
      ],
      slo: { p99Ms: 300, availability: 0.99 },
      expect: {
        minAvailability: 0.99,
        endAvailability: 0.999,
        endMaxP99Ms: 300,
        maxPods: 16,
      },
    },
    {
      id: "push-promotion",
      title: "A promotion brings the rush at once",
      visibility: "hidden",
      durationSeconds: 600,
      traffic: [{ at: 60, multiplier: 3 }],
      slo: { p99Ms: 300, availability: 0 },
      expect: { endAvailability: 0.999, endMaxP99Ms: 300, maxPods: 16 },
    },
  ],
  rubric: [
    {
      key: "handles-the-morning",
      title: "Handles the morning within the SLO",
      weight: 15,
      check: { check: "drill-passes", drillId: "quiet-morning" },
    },
    {
      key: "keeps-up-with-the-rush",
      title: "Keeps up while the lunch rush climbs",
      weight: 35,
      check: { check: "drill-passes", drillId: "lunch-rush" },
    },
    {
      key: "recovers-from-a-promotion",
      title: "Recovers when the rush arrives at once",
      weight: 20,
      check: { check: "drill-passes", drillId: "push-promotion" },
    },
    {
      key: "stays-within-budget",
      title: "Costs at most $1,200 a month at the morning's traffic",
      weight: 30,
      check: {
        check: "within-budget",
        drillId: "quiet-morning",
        monthlyUsd: 1_200,
      },
    },
  ],
  interview: {
    opening:
      "Hi! Today we're looking at a food-ordering API whose autoscaler was set up to cut the bill. Mornings are slow, lunch falls over, and finance is still not happy. How would you size it?",
    facts: [
      {
        topic: "Traffic",
        answer:
          "About 2,000 requests a second outside lunch, 80 % reads. From noon it climbs over seven minutes or so to three times that, and stays there for an hour.",
      },
      {
        topic: "Pods",
        answer:
          "One orders pod handles about 500 requests a second. A new one takes about 30 seconds to start.",
      },
      {
        topic: "Promotions",
        answer:
          "A few times a month marketing sends a push notification at lunch, and the whole rush lands in the same minute.",
      },
      {
        topic: "What counts as good",
        answer:
          "99.9 % of requests succeed and p99 stays under 300 ms. While the rush climbs, 99 % is acceptable, as long as the service is back to normal once it settles.",
      },
      {
        topic: "Limits",
        answer:
          "The cluster's quota gives the orders service 16 pods at most, and finance wants it to cost no more than $1,200 a month at the morning's traffic, database included.",
      },
      {
        topic: "The database",
        answer:
          "One Postgres instance with plenty of headroom. It is not the problem here.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on the traffic over the day, the targets during and after the rush, and the limits.",
      },
      {
        id: "high-level",
        minutes: 10,
        goal: "Size the pods for the morning and let an autoscaler add more for the rush, within the quota.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Tune the floor and the target so the autoscaler keeps up with a climb and recovers from a sudden rush.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Summarise what runs at each hour of the day and what it costs.",
      },
    ],
    rubric: [
      {
        key: "clarifies-requirements",
        dimension: "requirements",
        title: "Pins down the shape of the day",
        signals: [
          "Asks how fast the rush arrives and how long it lasts",
          "Asks how long a new pod takes to start",
          "Asks for the quota and the budget",
        ],
        weight: 15,
      },
      {
        key: "sizes-the-service",
        dimension: "scaling",
        title: "Sizes the service for the morning and grows it for the rush",
        signals: [
          "Works out the pods the morning and the rush each need",
          "Adds a pod autoscaler with a floor and a ceiling",
          "Keeps the ceiling within the quota and checks it carries the rush",
        ],
        weight: 30,
      },
      {
        key: "tunes-the-autoscaler",
        dimension: "reliability",
        title: "Leaves headroom for the autoscaler to react",
        signals: [
          "Explains that the autoscaler reacts after the load has risen",
          "Lowers the target utilisation so pods are added before they saturate",
          "Keeps a floor with headroom over the morning's traffic",
        ],
        weight: 25,
      },
      {
        key: "watches-cost",
        dimension: "operability",
        title: "Keeps the cost in view",
        signals: [
          "Compares the cost of a fleet sized for the rush with an autoscaled one",
          "Names what the headroom costs",
        ],
        weight: 10,
      },
      {
        key: "communicates",
        dimension: "communication",
        title: "Explains trade-offs and responds to challenges",
        signals: [
          "Names the trade-off between headroom and cost",
          "Changes the design when a drill or a question shows a problem",
        ],
        weight: 20,
      },
    ],
    drillIds: ["quiet-morning", "lunch-rush"],
  },
  hints: [
    {
      title: "Pay for the morning, not for lunch",
      body: "Six pods carry 2,000 requests a second with room to spare. A pod autoscaler that scales the deployment can add the rest when the rush comes, up to the quota of 16.",
      cost: 5,
    },
    {
      title: "Why the rush still hurts",
      body: "The autoscaler adds pods only after the pods it has stay above its target for a while. At 70 % they are already full by the time the new ones arrive.",
      cost: 10,
    },
    {
      title: "Add pods before they fill up",
      body: "A target of 60 % adds pods while there is still room on the ones running, so each step of the climb is met before diners feel it.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "Six orders pods carry the morning's 2,000 requests a second at two thirds of their capacity, for about $170 a month in pods. A pod autoscaler between six and sixteen pods, targeting 60 % utilisation, adds half again as many pods each time the running ones stay busy, so it stays ahead of a seven-minute climb to 6,000 requests a second and is back within the SLO a few steps after a promotion lands the rush at once. Twelve pods all day cost twice as much in pods and still fall over at lunch; sixteen all day carry the rush but take the service past its budget.",
    graph: graph(
      [
        ...front(),
        node("orders", "k8s-deployment", "Orders", {
          replicas: 6,
          capacityRpsPerReplica: 500,
          readinessProbe: true,
        }),
        node("autoscaler", "hpa", "Autoscaler", {
          min: 6,
          max: 16,
          targetUtilisation: 0.6,
        }),
        database(),
      ],
      [...calls(), edge("autoscaler", "orders", "scales")],
    ),
  },
};
