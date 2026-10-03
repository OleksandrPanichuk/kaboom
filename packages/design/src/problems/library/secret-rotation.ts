import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const customers = () =>
  node("customers", "client", "Customers", { rps: 1_500, readRatio: 0.8 });

const database = () =>
  node("orders-db", "sql-database", "Orders database", {
    readCapacityRps: 20_000,
    writeCapacityRps: 5_000,
  });

const wiring = () => [
  edge("customers", "ingress", "sync-call"),
  edge("ingress", "orders-svc", "sync-call"),
  edge("orders-svc", "orders", "sync-call"),
  edge("orders", "orders-db", "read"),
  edge("orders", "orders-db", "write"),
  edge("orders", "db-password", "mounts"),
];

export const secretRotation: ProblemContentInput = {
  slug: "secret-rotation",
  title: "Rotate a database password",
  track: "devops",
  difficulty: "medium",
  tags: ["kubernetes", "secrets", "rotation", "security"],
  summary:
    "Change the password the orders service uses for its database every month, without a single failed order.",
  statement: `The security team now requires the orders database password to be rotated every thirty days, and at once whenever it may have leaked.

**What it does**

- Customers place and look up orders through an ingress and a Kubernetes service in front of the orders pods.
- The pods read and write the orders database with a password kept in a Kubernetes secret.
- One pod handles 500 requests a second, and a new pod takes 30 seconds to start.

**How it is used**

- 1,500 requests a second through the day, and a sale brings half as much again.
- At least 99.9 % of requests must succeed at all times, rotations included.

**What to watch**

- The first rotation was an outage: the new password was saved, the old one was revoked, and the running pods kept using the old one until someone restarted them twenty minutes later.
- The database can accept the old and the new password side by side for as long as you choose.

The cluster is on the canvas as it was during that rotation. Change how it takes a new password.`,
  baseline: graph(
    [
      customers(),
      node("ingress", "ingress", "Ingress"),
      node("orders-svc", "k8s-service", "orders"),
      node("orders", "k8s-deployment", "Orders", {
        replicas: 3,
        capacityRpsPerReplica: 500,
        readinessProbe: true,
        secretDelivery: "env",
      }),
      database(),
      node("db-password", "secret", "Database password"),
    ],
    wiring(),
  ),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description: "1,500 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { maxP99Ms: 300, minAvailability: 0.999, forbid: ["saturated"] },
    },
    {
      id: "monthly-rotation",
      title: "The monthly rotation",
      description:
        "The database password is rotated a minute in, while 1,500 requests a second keep coming.",
      visibility: "public",
      durationSeconds: 900,
      faults: [
        {
          kind: "secret-rotation",
          select: { nodeKind: "secret" },
          at: 60,
        },
      ],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { minAvailability: 0.999 },
    },
    {
      id: "rotation-during-a-sale",
      title: "A rotation during a sale",
      visibility: "hidden",
      durationSeconds: 900,
      traffic: [{ at: 30, multiplier: 1.5 }],
      faults: [
        {
          kind: "secret-rotation",
          select: { nodeKind: "secret" },
          at: 60,
        },
      ],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { minAvailability: 0.999 },
    },
    {
      id: "pod-lost",
      title: "A node drains and takes a quarter of the pods",
      visibility: "hidden",
      durationSeconds: 300,
      faults: [
        {
          kind: "capacity",
          select: { nodeKind: "k8s-deployment" },
          at: 60,
          factor: 0.75,
        },
      ],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { minAvailability: 0.999 },
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
      key: "rotates-without-errors",
      title: "Rotates the password without failing a request",
      weight: 35,
      check: { check: "drill-passes", drillId: "monthly-rotation" },
    },
    {
      key: "rotates-at-peak",
      title: "Rotates during a sale without failing a request",
      weight: 20,
      check: { check: "drill-passes", drillId: "rotation-during-a-sale" },
    },
    {
      key: "pages-on-errors",
      title: "Pages someone when orders start failing",
      weight: 15,
      check: {
        check: "watches",
        nodeKind: "k8s-deployment",
        signal: "error-rate",
      },
    },
    {
      key: "survives-a-lost-pod",
      title: "Keeps serving when a quarter of the pods are lost",
      weight: 10,
      check: { check: "drill-passes", drillId: "pod-lost" },
    },
  ],
  interview: {
    opening:
      "Hi! Today we're looking at how an orders service gets a new database password. Security wants it rotated every month, and the first try was an outage. What would you like to know?",
    facts: [
      {
        topic: "Traffic",
        answer:
          "About 1,500 requests a second, 80 % lookups and 20 % new orders. A sale brings half as much again.",
      },
      {
        topic: "Pods",
        answer:
          "Three orders pods today, each handling about 500 requests a second. A new pod takes 30 seconds to start.",
      },
      {
        topic: "How the password reaches the pods",
        answer:
          "It is a Kubernetes secret, injected as an environment variable, so a pod reads it once when it starts.",
      },
      {
        topic: "The first rotation",
        answer:
          "Someone updated the secret and revoked the old password right away. Every running pod kept the old one, and orders failed for twenty minutes until the pods were restarted by hand.",
      },
      {
        topic: "The database",
        answer:
          "Postgres. It can keep two valid passwords, the old and the new, for as long as you like, through two users or a grace period.",
      },
      {
        topic: "Policy",
        answer:
          "Every thirty days, and immediately if a password may have leaked. Nobody should have to be awake for it.",
      },
      {
        topic: "Monitoring",
        answer:
          "A Prometheus is available and scrapes whatever it is pointed at every 15 seconds. Nothing pages anyone today.",
      },
      {
        topic: "Downtime",
        answer:
          "At least 99.9 % of requests must succeed, during a rotation as at any other time.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on how often the password changes, how it reaches the pods, and what the database allows.",
      },
      {
        id: "high-level",
        minutes: 10,
        goal: "A way for running pods to take a new password before the old one stops working.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Rotate during a sale without failing a request, and know within minutes when a rotation goes wrong.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Summarise the rotation, its order of steps, and what happens after a leak.",
      },
    ],
    rubric: [
      {
        key: "clarifies-requirements",
        dimension: "requirements",
        title: "Clarifies how the password is used before changing anything",
        signals: [
          "Asks how the pods read the password",
          "Asks whether the database can accept two passwords at once",
          "Asks how often rotations happen and who runs them",
        ],
        weight: 15,
      },
      {
        key: "designs-the-rotation",
        dimension: "design",
        title: "Designs a rotation in the right order",
        signals: [
          "Adds the new password before revoking the old one",
          "Keeps both valid for longer than the pods need to switch",
          "Explains why revoking first causes the outage",
        ],
        weight: 25,
      },
      {
        key: "delivers-the-new-value",
        dimension: "delivery",
        title: "Gets the new value into running pods",
        signals: [
          "Mounts the secret as a volume the pods re-read, or rolls the pods when it changes",
          "Rolls with surge and no unavailable pods, so capacity holds during a sale",
          "Explains what an environment variable does after a pod has started",
        ],
        weight: 25,
      },
      {
        key: "watches-rotations",
        dimension: "operability",
        title: "Notices a rotation that goes wrong",
        signals: [
          "Pages on the orders error rate through monitoring that scrapes the pods",
          "Plans what to do after a leak, when the old password must die at once",
        ],
        weight: 15,
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
        weight: 20,
      },
    ],
    drillIds: ["normal-day", "monthly-rotation"],
  },
  hints: [
    {
      title: "Why did the pods keep the old password?",
      body: "An environment variable is read once, when a pod starts. Changing the secret afterwards changes nothing in a running pod.",
      cost: 5,
    },
    {
      title: "Add first, revoke later",
      body: "Let the old password keep working for a while after the new one is out, long enough for every pod to switch. Then revoke it.",
      cost: 10,
    },
    {
      title: "Two ways to switch",
      body: "Mount the secret as a volume, which the kubelet refreshes within about a minute, or roll the pods whenever the secret changes. Either way, keep the old password valid until the switch is done.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "The password is mounted as a volume, which every pod re-reads within a minute of a change, and the database keeps the old password valid for five minutes after the new one is out. No pod ever holds a revoked password, so a rotation fails nothing, at a sale as on any other day. Six pods carry the sale at three quarters of their capacity, and a normal day with room to lose a quarter of them. Prometheus scrapes the orders pods, and an alert on their error rate pages someone if a rotation goes wrong anyway.",
    graph: graph(
      [
        customers(),
        node("ingress", "ingress", "Ingress"),
        node("orders-svc", "k8s-service", "orders"),
        node("orders", "k8s-deployment", "Orders", {
          replicas: 6,
          capacityRpsPerReplica: 500,
          readinessProbe: true,
          maxSurge: 1,
          maxUnavailable: 0,
          secretDelivery: "volume",
        }),
        database(),
        node("db-password", "secret", "Database password", {
          overlapSeconds: 300,
        }),
        node("metrics", "monitoring", "Prometheus"),
        node("failing", "alert", "Orders failing", {
          signal: "error-rate",
          forSeconds: 60,
        }),
      ],
      [
        ...wiring(),
        edge("metrics", "orders", "scrapes"),
        edge("failing", "orders", "watches"),
      ],
    ),
  },
};
