import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const shoppers = () =>
  node("shoppers", "client", "Shoppers", { rps: 2_000, readRatio: 0.7 });

export const zeroDowntimeRollout: ProblemContentInput = {
  slug: "zero-downtime-rollout",
  title: "Zero-downtime deploys",
  track: "devops",
  difficulty: "medium",
  tags: ["kubernetes", "rollouts", "readiness", "canary"],
  summary:
    "Ship a checkout service twenty times a day, peak hours included, without a shopper ever seeing a failed request.",
  statement: `Run the checkout service of an online shop on Kubernetes, and ship it without anyone noticing.

**What it does**

- Shoppers send their basket and get back an order, through an ingress and a Kubernetes service in front of the checkout pods.
- One pod handles 500 requests a second, and a new pod takes 30 seconds to start and answer.

**How it is used**

- 2,000 requests a second at peak, and evenings bring half as much again.
- The team deploys about twenty times a day, peak hours included.
- At least 99.9 % of requests must succeed, during a deploy as at any other time, and p99 must stay under 300 ms.

**What to watch**

- Last month a release could not reach the payment provider. Its pods never became ready, the rollout hung for an hour, and nobody noticed until a customer complained.
- Some bad releases pass every health check and fail every order.

The cluster is already on the canvas. Change how it is deployed.`,
  baseline: graph(
    [
      shoppers(),
      node("ingress", "ingress", "Ingress"),
      node("checkout-svc", "k8s-service", "checkout"),
      node("checkout", "k8s-deployment", "Checkout", {
        replicas: 1,
        capacityRpsPerReplica: 500,
        strategy: "recreate",
      }),
    ],
    [
      edge("shoppers", "ingress", "sync-call"),
      edge("ingress", "checkout-svc", "sync-call"),
      edge("checkout-svc", "checkout", "sync-call"),
    ],
  ),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description: "2,000 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 300, availability: 0.999 },
      expect: {
        maxP99Ms: 300,
        minAvailability: 0.999,
        forbid: ["saturated"],
      },
    },
    {
      id: "routine-deploy",
      title: "A routine deploy at peak",
      description:
        "A healthy release rolls out a minute in, while 2,000 requests a second keep coming.",
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
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { maxP99Ms: 300, minAvailability: 0.999 },
    },
    {
      id: "stuck-rollout",
      title: "The rollout is stuck",
      description:
        "A release whose pods never get ready rolls out a minute in. It will never finish; shoppers must not notice.",
      visibility: "public",
      durationSeconds: 900,
      faults: [
        {
          kind: "rollout",
          select: { nodeKind: "k8s-deployment" },
          at: 60,
          release: "never-ready",
        },
      ],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { maxP99Ms: 300, minAvailability: 0.999 },
    },
    {
      id: "broken-release",
      title: "A release that fails every order",
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
      slo: { p99Ms: 300, availability: 0 },
      expect: { endAvailability: 0.999 },
    },
    {
      id: "evening-peak",
      title: "The evening peak",
      visibility: "hidden",
      durationSeconds: 600,
      traffic: [{ at: 60, multiplier: 1.5 }],
      slo: { p99Ms: 300, availability: 0 },
      expect: { endAvailability: 0.999 },
    },
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Handles a normal day within the SLO",
      weight: 15,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "deploys-at-peak",
      title: "Deploys at peak without failing a request",
      weight: 20,
      check: { check: "drill-passes", drillId: "routine-deploy" },
    },
    {
      key: "survives-a-stuck-rollout",
      title: "Keeps serving while a rollout is stuck",
      weight: 20,
      check: { check: "drill-passes", drillId: "stuck-rollout" },
    },
    {
      key: "limits-a-bad-release",
      title: "Stops a release that fails every request",
      weight: 15,
      check: { check: "drill-passes", drillId: "broken-release" },
    },
    {
      key: "scales-with-traffic",
      title: "Grows with the evening peak",
      weight: 10,
      check: { check: "drill-passes", drillId: "evening-peak" },
    },
    {
      key: "notices-a-stuck-rollout",
      title: "Pages someone when a rollout stops making progress",
      weight: 10,
      check: {
        check: "watches",
        nodeKind: "k8s-deployment",
        signal: "rollout-progress",
      },
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
      "Hi! Today we're looking at how an online shop deploys its checkout service on Kubernetes. They ship about twenty times a day and want nobody to notice. What would you like to know first?",
    facts: [
      {
        topic: "Traffic",
        answer:
          "About 2,000 requests a second at peak, 70 % reads of the basket and 30 % orders. Evenings bring half as much again.",
      },
      {
        topic: "Pods",
        answer:
          "One checkout pod handles about 500 requests a second. A new pod takes 30 seconds to start and answer.",
      },
      {
        topic: "Deploys",
        answer:
          "About twenty a day, from a pipeline, peak hours included. Nobody wants to wait for a quiet hour.",
      },
      {
        topic: "Downtime",
        answer:
          "At least 99.9 % of requests must succeed during a deploy, as at any other time, with p99 under 300 ms.",
      },
      {
        topic: "Last month's incident",
        answer:
          "A release could not reach the payment provider, so its pods never became ready. The rollout hung for an hour and nobody noticed until a customer complained.",
      },
      {
        topic: "Bad releases",
        answer:
          "Now and then a release passes every health check and fails every order, for example after a wrong feature flag.",
      },
      {
        topic: "Config and secrets",
        answer:
          "Feature flags live in a config map, and the payment provider's keys in a secret.",
      },
      {
        topic: "On call",
        answer:
          "One engineer is on call. They get paged for anything users feel, and want as few pages as that allows.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on the traffic, how often the team deploys and what counts as downtime.",
      },
      {
        id: "high-level",
        minutes: 15,
        goal: "A cluster that serves peak traffic, with a rollout strategy and probes that keep every request served during a deploy.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Survive a rollout that never finishes and a release that fails every request, and make sure someone finds out.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Summarise how a deploy goes, how it fails, and what changes with ten times the deploys.",
      },
    ],
    rubric: [
      {
        key: "clarifies-requirements",
        dimension: "requirements",
        title: "Clarifies the requirements before designing",
        signals: [
          "Asks how often the team deploys and whether at peak",
          "Asks what counts as downtime and how much failure is allowed",
          "Asks how long a pod takes to start",
        ],
        weight: 10,
      },
      {
        key: "designs-the-cluster",
        dimension: "design",
        title: "Lays out the cluster that serves the checkout",
        signals: [
          "Routes traffic through an ingress and a service to stateless pods",
          "Keeps config and secrets out of the image",
          "Sizes the pods for peak with room to lose one",
        ],
        weight: 15,
      },
      {
        key: "ships-without-downtime",
        dimension: "delivery",
        title: "Rolls out without failing a request",
        signals: [
          "Chooses a strategy and explains what recreate would do",
          "Adds a readiness probe so a new pod gets traffic only once it answers",
          "Uses surge rather than unavailability, so capacity never drops at peak",
          "Uses a canary or another gate so a release that fails every request is stopped and rolled back",
        ],
        weight: 30,
      },
      {
        key: "scales-for-peak",
        dimension: "scaling",
        title: "Keeps up with the evening peak",
        signals: [
          "Adds a pod autoscaler with a floor that leaves headroom",
          "Explains that the autoscaler reacts late and what shoppers see meanwhile",
        ],
        weight: 10,
      },
      {
        key: "notices-trouble",
        dimension: "operability",
        title: "Makes sure a failing deploy reaches a person",
        signals: [
          "Explains that a stuck rollout does not fail loudly",
          "Alerts on rollout progress and on the error rate users feel",
          "Keeps pages for what users notice",
        ],
        weight: 15,
      },
      {
        key: "communicates",
        dimension: "communication",
        title: "Explains trade-offs and responds to challenges",
        signals: [
          "Thinks aloud and keeps the design and the explanation in step",
          "Names the trade-off behind each choice, such as rollout speed against safety",
          "Changes the design when a drill or a question shows a problem",
        ],
        weight: 20,
      },
    ],
    drillIds: ["normal-day", "routine-deploy", "stuck-rollout"],
  },
  hints: [
    {
      title: "Why do shoppers see errors during a deploy?",
      body: "Recreate takes every pod away before the new ones start. And without a readiness probe, a new pod gets traffic as soon as it exists, whether or not it can answer.",
      cost: 5,
    },
    {
      title: "Make the rollout wait for ready pods",
      body: "Roll out with a surge of one and none unavailable, behind a readiness probe, so a new pod takes traffic only once it answers and capacity never drops. Run enough pods to carry the peak.",
      cost: 10,
    },
    {
      title: "Catch what the probe cannot",
      body: "A canary tries one pod first and rolls back if it fails. A rollout that never finishes hurts nobody, so only an alert on its progress tells anyone.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "Six checkout pods carry the 2,000 requests a second at two thirds of their capacity. A canary with a readiness probe, a surge of one and none unavailable never runs fewer than six pods. A pod that never gets ready gets no traffic, and a canary that fails orders is rolled back after one step, which costs about one request in seven for ten seconds. A pod autoscaler between six and twelve pods absorbs the evening peak a few steps late. An alert on rollout progress pages the on-call engineer when a rollout stops moving, which nothing else would.",
    graph: graph(
      [
        shoppers(),
        node("ingress", "ingress", "Ingress"),
        node("checkout-svc", "k8s-service", "checkout"),
        node("checkout", "k8s-deployment", "Checkout", {
          replicas: 6,
          capacityRpsPerReplica: 500,
          strategy: "canary",
          maxSurge: 1,
          maxUnavailable: 0,
          readinessProbe: true,
          canarySeconds: 60,
        }),
        node("autoscaler", "hpa", "Autoscaler", { min: 6, max: 12 }),
        node("stuck", "alert", "Rollout stuck", {
          signal: "rollout-progress",
          forSeconds: 600,
        }),
        node("flags", "config-map", "Feature flags"),
        node("keys", "secret", "Payment keys", { source: "external-store" }),
      ],
      [
        edge("shoppers", "ingress", "sync-call"),
        edge("ingress", "checkout-svc", "sync-call"),
        edge("checkout-svc", "checkout", "sync-call"),
        edge("autoscaler", "checkout", "scales"),
        edge("stuck", "checkout", "watches"),
        edge("checkout", "flags", "mounts"),
        edge("checkout", "keys", "mounts"),
      ],
    ),
  },
};
