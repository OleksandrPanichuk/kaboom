import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const searchers = () =>
  node("searchers", "client", "Searchers", { rps: 3_000, readRatio: 0.95 });

const front = () => [
  node("ingress", "ingress", "Ingress"),
  node("search-svc", "k8s-service", "search"),
];

const wiring = () => [
  edge("searchers", "ingress", "sync-call"),
  edge("ingress", "search-svc", "sync-call"),
  edge("search-svc", "search", "sync-call"),
];

export const latencyRegression: ProblemContentInput = {
  slug: "latency-regression",
  title: "p99 doubled after a deploy",
  track: "devops",
  difficulty: "medium",
  tags: ["incident", "latency", "canary", "alerting"],
  summary:
    "A release made search twice as slow and nobody noticed for an hour. Make the next one get caught and undone in minutes.",
  statement: `Last Tuesday a release of the product search API made every request take twice as long. Nothing failed, so nothing paged anyone: p99 went from about 200 ms to over 400 ms for an hour, until a product manager asked why search felt slow.

**What it does**

- Shoppers search the catalogue through an ingress and a Kubernetes service in front of the search pods.
- One pod handles 500 requests a second and answers in about 40 ms when it is idle. A new pod takes 30 seconds to start.

**How it is used**

- 3,000 requests a second through the day, and a busy hour brings 30 % more.
- p99 must stay under 250 ms, with 99.9 % of requests served, deploys included.
- The team ships several times a day, and some releases will be slower than the last.

**What to watch**

- A slow release answers every request, so health checks and error alerts stay green.
- The budget allows at most 14 search pods, autoscaling included.

The canvas holds the search deployment as it was on Tuesday. Change how it runs, ships and is watched.`,
  baseline: graph(
    [
      searchers(),
      ...front(),
      node("search", "k8s-deployment", "Search", {
        replicas: 1,
        capacityRpsPerReplica: 500,
        baseLatencyMs: 40,
        strategy: "recreate",
      }),
    ],
    wiring(),
  ),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description:
        "3,000 requests a second for five minutes, within the budget of 14 pods.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 250, availability: 0.999 },
      expect: {
        maxP99Ms: 250,
        minAvailability: 0.999,
        maxPods: 14,
        forbid: ["saturated"],
      },
    },
    {
      id: "healthy-deploy",
      title: "A routine deploy",
      description:
        "A healthy release rolls out a minute in, while 3,000 requests a second keep coming.",
      visibility: "public",
      durationSeconds: 600,
      faults: [
        {
          kind: "rollout",
          select: { nodeKind: "k8s-deployment" },
          at: 60,
          release: "healthy",
        },
      ],
      slo: { p99Ms: 250, availability: 0.999 },
      expect: { maxP99Ms: 250, minAvailability: 0.999 },
    },
    {
      id: "slow-release",
      title: "A release twice as slow",
      description:
        "A release whose pods take twice as long per request rolls out a minute in. p99 may jump, but it must be back under 250 ms by the end.",
      visibility: "public",
      durationSeconds: 600,
      faults: [
        {
          kind: "rollout",
          select: { nodeKind: "k8s-deployment" },
          at: 60,
          release: "slow",
        },
      ],
      slo: { p99Ms: 250, availability: 0 },
      expect: { endMaxP99Ms: 250, endAvailability: 0.999 },
    },
    {
      id: "broken-release",
      title: "A release that fails every search",
      visibility: "hidden",
      durationSeconds: 600,
      faults: [
        {
          kind: "rollout",
          select: { nodeKind: "k8s-deployment" },
          at: 60,
          release: "broken",
        },
      ],
      slo: { p99Ms: 250, availability: 0 },
      expect: { endAvailability: 0.999 },
    },
    {
      id: "slow-without-a-deploy",
      title: "Search slows down with no deploy",
      visibility: "hidden",
      durationSeconds: 600,
      faults: [
        {
          kind: "latency",
          select: { nodeKind: "k8s-deployment" },
          at: 60,
          addMs: 200,
        },
      ],
      slo: { p99Ms: 250, availability: 0 },
      expect: { detectWithinSeconds: 360 },
    },
    {
      id: "busy-hour",
      title: "The busy hour",
      visibility: "hidden",
      durationSeconds: 600,
      traffic: [{ at: 60, multiplier: 1.3 }],
      slo: { p99Ms: 250, availability: 0 },
      expect: { endMaxP99Ms: 250, endAvailability: 0.999 },
    },
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Handles a normal day within the SLO and the budget",
      weight: 15,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "deploys-cleanly",
      title: "Ships a healthy release without hurting latency",
      weight: 15,
      check: { check: "drill-passes", drillId: "healthy-deploy" },
    },
    {
      key: "undoes-a-slow-release",
      title: "Undoes a release that doubles latency",
      weight: 25,
      check: { check: "drill-passes", drillId: "slow-release" },
    },
    {
      key: "undoes-a-broken-release",
      title: "Undoes a release that fails every request",
      weight: 10,
      check: { check: "drill-passes", drillId: "broken-release" },
    },
    {
      key: "grows-for-the-busy-hour",
      title: "Grows for the busy hour within the budget",
      weight: 10,
      check: { check: "drill-passes", drillId: "busy-hour" },
    },
    {
      key: "pages-on-latency",
      title: "Pages someone when latency degrades",
      weight: 5,
      check: {
        check: "watches",
        nodeKind: "k8s-deployment",
        signal: "latency",
      },
    },
    {
      key: "pages-within-minutes",
      title: "Pages someone within minutes when search slows for any reason",
      weight: 10,
      check: { check: "drill-passes", drillId: "slow-without-a-deploy" },
    },
    {
      key: "no-single-point-of-failure",
      title: "Has no single point of failure",
      weight: 10,
      check: { check: "no-lint", lint: "spof-critical-path" },
    },
  ],
  interview: {
    opening:
      "Hi! Let's talk about an incident. Last Tuesday a deploy made the search API twice as slow, and nobody noticed for an hour. I'd like you to make sure the next one is caught and undone quickly. What would you like to know?",
    facts: [
      {
        topic: "The incident",
        answer:
          "A release added a slow query to every search. p99 went from about 200 ms to over 400 ms. No request failed, so no alert fired, and a product manager noticed an hour later.",
      },
      {
        topic: "Traffic",
        answer:
          "About 3,000 searches a second through the day, and a busy hour brings 30 % more.",
      },
      {
        topic: "Pods",
        answer:
          "One pod handles about 500 requests a second and answers in about 40 ms when idle. A new pod takes 30 seconds to start.",
      },
      {
        topic: "Targets",
        answer:
          "p99 under 250 ms and 99.9 % of requests served, during deploys too.",
      },
      {
        topic: "Budget",
        answer:
          "At most 14 search pods, autoscaling included. Doubling the cluster to hide a slow release is not an option.",
      },
      {
        topic: "Deploys",
        answer:
          "Several a day, from a pipeline, at any hour. Today they roll out with recreate, all pods at once.",
      },
      {
        topic: "Monitoring",
        answer:
          "A Prometheus scrapes latency and error metrics from whatever it is pointed at, every 15 seconds by default. The only alert today is on the error rate.",
      },
      {
        topic: "On call",
        answer:
          "One engineer is on call and wants to be paged only for what users feel.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Understand what happened, why nothing caught it, and the targets and budget.",
      },
      {
        id: "high-level",
        minutes: 15,
        goal: "A deployment sized for the traffic within budget, with a rollout that does not hurt latency.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Catch and undo a slow release automatically, page on latency users feel, and survive the busy hour.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Walk through how the next slow release would go, minute by minute.",
      },
    ],
    rubric: [
      {
        key: "clarifies-the-incident",
        dimension: "requirements",
        title: "Works out why nothing caught the incident",
        signals: [
          "Asks what failed and what was only slow",
          "Notices that error-based alerts and health checks cannot see a slow release",
          "Asks for the latency target and the budget",
        ],
        weight: 10,
      },
      {
        key: "sizes-the-deployment",
        dimension: "design",
        title: "Sizes the deployment for latency, not just throughput",
        signals: [
          "Explains that latency climbs as pods get busy",
          "Keeps enough headroom to meet p99 within the budget",
        ],
        weight: 10,
      },
      {
        key: "stops-slow-releases",
        dimension: "delivery",
        title: "Catches and undoes a slow release automatically",
        signals: [
          "Uses a canary or a progressive rollout that compares the new version's latency with the old",
          "Rolls back without waiting for a person",
          "Explains why a readiness probe alone does not help",
        ],
        weight: 25,
      },
      {
        key: "pages-on-latency",
        dimension: "operability",
        title: "Makes a latency regression reach a person",
        signals: [
          "Alerts on p99 latency, not only on errors",
          "Chooses how long latency must stay bad before paging",
          "Ties the alert to what users feel",
        ],
        weight: 25,
      },
      {
        key: "handles-the-busy-hour",
        dimension: "scaling",
        title: "Grows for the busy hour within the budget",
        signals: [
          "Adds a pod autoscaler with a ceiling at the budget",
          "Explains what users see while it catches up",
        ],
        weight: 10,
      },
      {
        key: "communicates",
        dimension: "communication",
        title: "Explains trade-offs and responds to challenges",
        signals: [
          "Thinks aloud and keeps the design and the explanation in step",
          "Names the trade-off behind each choice, such as rollout speed against how much of a bad release users see",
          "Changes the design when a drill or a question shows a problem",
        ],
        weight: 20,
      },
    ],
    drillIds: ["normal-day", "healthy-deploy", "slow-release"],
  },
  hints: [
    {
      title: "Why did nothing notice?",
      body: "A slow release answers every request, so readiness probes and error alerts stay green. Only latency shows it.",
      cost: 5,
    },
    {
      title: "Let one pod go first",
      body: "A canary sends a small share of requests to one new pod and compares how it does. A slow canary is rolled back before the rest follows.",
      cost: 10,
    },
    {
      title: "Room for the busy hour",
      body: "Run enough pods for p99 under 250 ms at 3,000 requests a second, and let a pod autoscaler grow to the budget of 14 for the busy hour.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "Eleven search pods carry 3,000 requests a second at just over half of their capacity, which keeps p99 under 200 ms with room for a bad minute. A pod autoscaler between eleven and fourteen pods covers the busy hour within the budget. Deploys go out as a canary behind a readiness probe, with a surge of one and none unavailable: a slow or broken canary is rolled back after one step, so a tenth of the requests are slow or fail for ten seconds. Prometheus scrapes the search pods every 15 seconds, and an alert on latency pages the on-call engineer once p99 has stayed high for five minutes, whatever made it slow, which an error alert never would.",
    graph: graph(
      [
        searchers(),
        ...front(),
        node("search", "k8s-deployment", "Search", {
          replicas: 11,
          capacityRpsPerReplica: 500,
          baseLatencyMs: 40,
          strategy: "canary",
          maxSurge: 1,
          maxUnavailable: 0,
          readinessProbe: true,
          canarySeconds: 60,
        }),
        node("autoscaler", "hpa", "Autoscaler", { min: 11, max: 14 }),
        node("slow", "alert", "Search is slow", {
          signal: "latency",
          forSeconds: 300,
        }),
        node("metrics", "monitoring", "Prometheus"),
      ],
      [
        ...wiring(),
        edge("autoscaler", "search", "scales"),
        edge("slow", "search", "watches"),
        edge("metrics", "search", "scrapes"),
      ],
    ),
  },
};
