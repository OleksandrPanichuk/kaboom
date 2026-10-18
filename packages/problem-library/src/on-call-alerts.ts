import { edge, graph, node } from "@repo/design/build";
import type { ProblemContentInput } from "@repo/scoring";

const diners = () =>
  node("diners", "client", "Diners", { rps: 1_500, readRatio: 0.8 });

const cluster = () => [
  diners(),
  node("ingress", "ingress", "Ingress"),
  node("orders-svc", "k8s-service", "orders"),
  node("orders", "k8s-deployment", "Orders", {
    replicas: 6,
    capacityRpsPerReplica: 500,
    readinessProbe: true,
  }),
  node("db", "sql-database", "Orders DB"),
];

const calls = () => [
  edge("diners", "ingress", "sync-call"),
  edge("ingress", "orders-svc", "sync-call"),
  edge("orders-svc", "orders", "sync-call"),
  edge("orders", "db", "read"),
  edge("orders", "db", "write"),
];

export const onCallAlerts: ProblemContentInput = {
  slug: "on-call-alerts",
  title: "Page someone, but only when it matters",
  track: "devops",
  difficulty: "easy",
  tags: ["monitoring", "alerting", "on-call", "prometheus"],
  summary:
    "Set up the alerts for a food-ordering API so the on-call engineer hears about every outage within minutes, and sleeps through the rest.",
  statement: `A food-ordering app runs its orders API on Kubernetes, and nothing watches it. Add the monitoring and the alerts.

**What it does**

- Diners browse menus and place orders through an ingress and a Kubernetes service in front of the orders pods.
- The pods read and write a Postgres database.

**How it is used**

- About 1,500 requests a second, 80 % of them reads.
- Six pods carry it with room to spare. The design already serves the traffic: this problem is about who finds out when it stops.

**What to watch**

- Last week the database went down at night, and the team learned about it from angry reviews the next morning. An outage must page the on-call engineer within three minutes.
- When requests turn slow rather than failing, someone must hear about it within five.
- The previous on-call rota quit over alerts that fired for every blip: a pod restarting, a half-minute spike at lunch. Nobody may be paged for something that clears on its own.

The cluster and the team's first attempt at alerting are on the canvas: Prometheus scraping every five minutes, and one alert that pages on any error at all. Fix what watches the cluster.`,
  baseline: graph(
    [
      ...cluster(),
      node("prometheus", "monitoring", "Prometheus", {
        scrapeIntervalSeconds: 300,
      }),
      node("any-error", "alert", "Any error", {
        signal: "error-rate",
        forSeconds: 0,
      }),
    ],
    [
      ...calls(),
      edge("prometheus", "orders", "scrapes"),
      edge("any-error", "orders", "watches"),
    ],
  ),
  drills: [
    {
      id: "normal-day",
      title: "A normal day, and nobody is paged",
      description:
        "1,500 requests a second for ten minutes. Four minutes in, a pod restarts and one request in fifty fails for twenty seconds. Nobody needs to be woken for that.",
      visibility: "public",
      durationSeconds: 600,
      faults: [
        {
          kind: "error-rate",
          select: { nodeKind: "k8s-deployment" },
          at: 240,
          until: 260,
          rate: 0.02,
        },
      ],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: {
        maxP99Ms: 300,
        endAvailability: 0.999,
        forbid: ["alert-fired"],
      },
    },
    {
      id: "database-down",
      title: "The database goes down",
      description:
        "The database fails a minute in and stays down. Someone must be paged within three minutes.",
      visibility: "public",
      durationSeconds: 600,
      faults: [
        { kind: "node-down", select: { nodeKind: "sql-database" }, at: 60 },
      ],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { detectWithinSeconds: 180 },
    },
    {
      id: "slow-pods",
      title: "The orders pods turn slow",
      description:
        "A minute in, every request through the orders pods takes 400 ms longer. Someone must be paged within five minutes.",
      visibility: "public",
      durationSeconds: 600,
      faults: [
        {
          kind: "latency",
          select: { nodeKind: "k8s-deployment" },
          at: 60,
          addMs: 400,
        },
      ],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { detectWithinSeconds: 300 },
    },
    {
      id: "failing-orders",
      title: "One order in twenty fails",
      visibility: "hidden",
      durationSeconds: 600,
      faults: [
        {
          kind: "error-rate",
          select: { nodeKind: "k8s-deployment" },
          at: 60,
          rate: 0.05,
        },
      ],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { detectWithinSeconds: 240 },
    },
    {
      id: "lunch-spike",
      title: "A half-minute spike at lunch",
      visibility: "hidden",
      durationSeconds: 600,
      traffic: [
        { at: 120, multiplier: 2.5 },
        { at: 150, multiplier: 1 },
      ],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { endAvailability: 0.999, forbid: ["alert-fired"] },
    },
  ],
  rubric: [
    {
      key: "quiet-on-a-normal-day",
      title: "Pages nobody on a normal day",
      weight: 15,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "pages-on-an-outage",
      title: "Pages within three minutes when the database goes down",
      weight: 20,
      check: { check: "drill-passes", drillId: "database-down" },
    },
    {
      key: "pages-on-slow-pods",
      title: "Pages within five minutes when the pods turn slow",
      weight: 20,
      check: { check: "drill-passes", drillId: "slow-pods" },
    },
    {
      key: "pages-on-failing-orders",
      title: "Pages when a share of orders fails",
      weight: 15,
      check: { check: "drill-passes", drillId: "failing-orders" },
    },
    {
      key: "sleeps-through-a-spike",
      title: "Lets a spike that clears on its own go by",
      weight: 20,
      check: { check: "drill-passes", drillId: "lunch-spike" },
    },
    {
      key: "watches-the-database",
      title: "Watches the database's latency, to tell it from slow pods",
      weight: 10,
      check: {
        check: "watches",
        nodeKind: "sql-database",
        signal: "latency",
      },
    },
  ],
  interview: {
    opening:
      "Hi! Today we're looking at a food-ordering API that nobody monitors. Last week its database went down at night and the team found out from reviews the next morning. How would you make sure that doesn't happen again?",
    facts: [
      {
        topic: "Traffic",
        answer:
          "About 1,500 requests a second, 80 % reads of menus and orders, 20 % new orders and updates.",
      },
      {
        topic: "The cluster",
        answer:
          "An ingress and a Kubernetes service in front of six orders pods, which use one Postgres database. It handles the traffic comfortably.",
      },
      {
        topic: "Last week's outage",
        answer:
          "The database went down at about two in the morning. Every order failed for six hours, and the first anyone heard of it was a one-star review.",
      },
      {
        topic: "How fast",
        answer:
          "An outage should page someone within three minutes. Requests turning slow, within five.",
      },
      {
        topic: "The old alerts",
        answer:
          "A previous attempt paged on every error the moment it happened. Lunchtime brings half-minute spikes that clear by themselves, and the on-call engineer was woken for each one. They turned the alerts off.",
      },
      {
        topic: "On call",
        answer:
          "One engineer at a time, for a week. They are fine with being woken for something diners feel, and nothing else.",
      },
      {
        topic: "Monitoring",
        answer:
          "Nothing runs today. The team is happy to run Prometheus in the cluster, scraping every 15 seconds.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on what must page someone, how fast, and what must not.",
      },
      {
        id: "high-level",
        minutes: 10,
        goal: "Monitoring that scrapes the pods and the database, and an alert for each way diners can be hurt.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Tune each alert's threshold and duration so outages page in time and lunchtime spikes do not.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Summarise what pages, how fast, and what the on-call engineer does first.",
      },
    ],
    rubric: [
      {
        key: "clarifies-requirements",
        dimension: "requirements",
        title: "Asks what is worth waking someone for",
        signals: [
          "Asks how fast an outage must reach a person",
          "Asks what went wrong with the previous alerts",
          "Separates what diners feel from what only the team sees",
        ],
        weight: 15,
      },
      {
        key: "monitors-the-system",
        dimension: "design",
        title: "Collects the signals the alerts need",
        signals: [
          "Adds monitoring that scrapes the pods and the database",
          "Explains that an alert on a target nothing scrapes never fires",
          "Scrapes often enough for an outage to page in time",
        ],
        weight: 15,
      },
      {
        key: "alerts-on-symptoms",
        dimension: "operability",
        title: "Alerts on what diners feel",
        signals: [
          "Alerts on the error rate and the latency of the orders pods",
          "Explains that a database outage shows up as failing orders",
          "Adds an alert on the database itself to tell a slow database from slow pods",
        ],
        weight: 25,
      },
      {
        key: "keeps-pages-quiet",
        dimension: "operability",
        title: "Keeps the pager quiet when nothing is wrong",
        signals: [
          "Uses a duration before an alert fires so a short spike does not page",
          "Works out that the duration plus the scrape interval fits within the time allowed",
          "Avoids alerting on causes that hurt no one, such as high CPU on its own",
        ],
        weight: 25,
      },
      {
        key: "communicates",
        dimension: "communication",
        title: "Explains trade-offs and responds to challenges",
        signals: [
          "Names the trade-off between paging fast and paging falsely",
          "Changes the design when a drill or a question shows a problem",
        ],
        weight: 20,
      },
    ],
    drillIds: ["normal-day", "database-down", "slow-pods"],
  },
  hints: [
    {
      title: "Why does the outage page so late?",
      body: "An alert fires once its signal has held for its duration, plus the scrape interval of the monitoring that reads it. Prometheus scrapes every five minutes here, so nothing can page sooner than that.",
      cost: 5,
    },
    {
      title: "Alert on what diners feel",
      body: "When the database goes down, orders fail at the pods, so an alert on their error rate sees it. Slow requests need a second alert, on latency, and a slow database shows only on the database itself.",
      cost: 10,
    },
    {
      title: "Wait before paging",
      body: "An alert that pages on the first error wakes someone for a pod restart. Holding it for a minute or two lets a blip go by, and with a 15-second scrape it still pages within three minutes.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "Prometheus scrapes the orders pods and the database every 15 seconds. An alert on the pods' error rate, held for a minute, pages about 75 seconds into a database outage or a release that fails one order in twenty, while a half-minute spike at lunch clears before it counts. An alert on the pods' latency, held for two minutes, pages a little over two minutes after they turn slow, and a second latency alert on the database tells a slow database from slow pods. Nothing fires on a normal day.",
    graph: graph(
      [
        ...cluster(),
        node("prometheus", "monitoring", "Prometheus"),
        node("orders-failing", "alert", "Orders failing", {
          signal: "error-rate",
          forSeconds: 60,
        }),
        node("orders-slow", "alert", "Orders slow", {
          signal: "latency",
          forSeconds: 120,
        }),
        node("db-slow", "alert", "Database slow", {
          signal: "latency",
          forSeconds: 120,
        }),
      ],
      [
        ...calls(),
        edge("prometheus", "orders", "scrapes"),
        edge("prometheus", "db", "scrapes"),
        edge("orders-failing", "orders", "watches"),
        edge("orders-slow", "orders", "watches"),
        edge("db-slow", "db", "watches"),
      ],
    ),
  },
};
