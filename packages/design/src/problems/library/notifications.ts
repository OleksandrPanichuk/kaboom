import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const apps = () => node("apps", "client", "Apps", { rps: 2_000, readRatio: 0 });
const push = () =>
  node("push", "external-api", "Push provider", {
    rateLimitRps: 10_000,
    errorRate: 0.01,
    baseLatencyMs: 120,
  });
const sms = () =>
  node("sms", "external-api", "SMS provider", {
    rateLimitRps: 500,
    errorRate: 0.01,
    baseLatencyMs: 300,
  });

export const notifications: ProblemContentInput = {
  slug: "notifications",
  title: "Notification service",
  track: "system-design",
  difficulty: "medium",
  tags: ["queues", "third-party", "scheduling", "back-pressure"],
  summary:
    "Send push and SMS notifications for other teams' apps, through providers you do not control.",
  statement: `Design the service every team in a company calls to notify its users.

**What it does**

- An app calls the service to send a notification; the service stores it and answers at once.
- Each notification goes out as a push, and one in ten also as an SMS.
- Every ten minutes a digest job sends a round of reminders.

**How it is used**

- Apps send 2,000 notifications a second.
- A digest run sends 4,000 more a second for one minute.
- An app should get its answer within 200 ms at p99, and 99.9 % of its calls must succeed.

**What to watch**

- The push provider accepts 10,000 calls a second and the SMS provider only 500; calls above that are refused.
- Either provider can go down for minutes. That must not fail the apps that call you.
- A digest must go out once, not once per server that runs it.
- What piles up during a digest or an outage has to be sent by the end.

The apps and both providers are already on the canvas. Build what sits between them.`,
  baseline: graph([apps(), push(), sms()]),
  drills: [
    {
      id: "normal-day",
      title: "A normal day with a digest",
      description:
        "2,000 notifications a second and one digest run. Nothing may be refused by a provider, and the queue must be empty by the end.",
      visibility: "public",
      durationSeconds: 600,
      slo: { p99Ms: 200, availability: 0.999 },
      expect: {
        maxP99Ms: 200,
        minAvailability: 0.999,
        maxEndBacklog: 0,
        forbid: ["throttled"],
      },
    },
    {
      id: "push-down",
      title: "The push provider goes down",
      description: "The push provider fails every call for three minutes.",
      visibility: "public",
      durationSeconds: 300,
      faults: [
        {
          kind: "node-down",
          select: { nodeKind: "external-api" },
          at: 60,
          until: 240,
        },
      ],
      slo: { p99Ms: 200, availability: 0.999 },
      expect: { maxP99Ms: 200, minAvailability: 0.999 },
    },
    {
      id: "providers-slow",
      title: "The providers slow down",
      visibility: "hidden",
      durationSeconds: 300,
      faults: [
        {
          kind: "latency",
          select: { nodeKind: "external-api" },
          at: 30,
          addMs: 2_000,
        },
      ],
      slo: { p99Ms: 200, availability: 0.999 },
      expect: { maxP99Ms: 200, minAvailability: 0.999 },
    },
    {
      id: "busy-hour",
      title: "A busy five minutes",
      visibility: "hidden",
      durationSeconds: 600,
      traffic: [
        { at: 0, multiplier: 1.5 },
        { at: 300, multiplier: 1 },
      ],
      slo: { p99Ms: 200, availability: 0.999 },
      expect: {
        minAvailability: 0.999,
        maxEndBacklog: 0,
        forbid: ["throttled"],
      },
    },
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Sends a normal day and its digest within the limits",
      weight: 25,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "survives-a-provider-outage",
      title: "Keeps answering apps while a provider is down",
      weight: 25,
      check: { check: "drill-passes", drillId: "push-down" },
    },
    {
      key: "ignores-slow-providers",
      title: "Stays fast when the providers are slow",
      weight: 15,
      check: { check: "drill-passes", drillId: "providers-slow" },
    },
    {
      key: "absorbs-a-busy-hour",
      title: "Catches up after a busy stretch",
      weight: 10,
      check: { check: "drill-passes", drillId: "busy-hour" },
    },
    {
      key: "runs-the-digest",
      title: "Runs the digest on a schedule",
      weight: 5,
      check: { check: "has-node-kind", nodeKind: "scheduler" },
    },
    {
      key: "sends-each-digest-once",
      title: "Sends each digest once",
      weight: 5,
      check: { check: "no-lint", lint: "duplicate-schedule" },
    },
    {
      key: "keeps-providers-off-the-request-path",
      title: "Keeps the providers off the request path",
      weight: 15,
      check: { check: "no-lint", lint: "sync-third-party" },
    },
  ],
  reference: {
    notes:
      "The API stores each notification and hands it to a queue, so no provider is ever on the request path. A single scheduler replica feeds the digest into the same queue. Workers are sized to what the SMS provider takes: at most about 3,800 messages a second, of which a tenth, 380, go to SMS against its limit of 500. The queue absorbs the digest and any outage, and drains before the end.",
    graph: graph(
      [
        apps(),
        node("lb", "load-balancer", "Load balancer"),
        node("api", "service", "Notify API", {
          replicas: 4,
          capacityRpsPerReplica: 1_000,
        }),
        node("db", "nosql-database", "Notifications"),
        node("digest", "scheduler", "Digest", {
          everySeconds: 600,
          burstSeconds: 60,
          jobsPerSecond: 4_000,
        }),
        node("queue", "queue", "Outbox", { capacityMsgPerSecond: 20_000 }),
        node("workers", "worker", "Senders", {
          replicas: 4,
          capacityMsgPerReplica: 1_000,
        }),
        push(),
        sms(),
      ],
      [
        edge("apps", "lb", "sync-call"),
        edge("lb", "api", "sync-call"),
        edge("api", "db", "write"),
        edge("api", "queue", "async-message"),
        edge("digest", "queue", "async-message"),
        edge("queue", "workers", "async-message"),
        edge("workers", "push", "sync-call"),
        edge("workers", "sms", "sync-call", { share: 0.1 }),
      ],
    ),
  },
};
