import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const accounts = () =>
  node("accounts", "client", "Accounts", { rps: 1_000, readRatio: 0.6 });

const database = () =>
  node("billing-db", "sql-database", "Billing database", {
    readCapacityRps: 20_000,
    writeCapacityRps: 5_000,
  });

const wiring = () => [
  edge("accounts", "ingress", "sync-call"),
  edge("ingress", "billing-svc", "sync-call"),
  edge("billing-svc", "billing", "sync-call"),
  edge("billing", "billing-db", "read"),
  edge("billing", "billing-db", "write"),
];

const rollout = (release: "healthy" | "broken", migrates: boolean) => ({
  kind: "rollout" as const,
  select: { nodeKind: "k8s-deployment" as const },
  at: 60,
  release,
  migrates,
});

export const schemaMigration: ProblemContentInput = {
  slug: "schema-migration",
  title: "Ship a schema change without downtime",
  track: "devops",
  difficulty: "hard",
  tags: ["kubernetes", "migrations", "blue-green", "expand-contract"],
  summary:
    "Deploy a billing release that changes the database schema, and keep the way back open if it goes wrong.",
  statement: `The billing team moved to blue-green deploys so that a release could be switched in, and out, in one step. Then a release renamed a column.

**What it does**

- Accounts read and pay invoices through an ingress and a Kubernetes service in front of the billing pods.
- Each release runs its database migration first, then rolls out the new pods.
- One pod handles 500 requests a second, and a new pod takes 30 seconds to start.

**How it is used**

- 1,000 requests a second: 60 % read invoices and 40 % record payments.
- At least 99.9 % of requests must succeed during a deploy, as at any other time.

**What to watch**

- The release that renamed the column broke every request the old pods served the moment its migration ran, so the blue set failed while the green one was still starting.
- Switching back did not help: the old version could not read the renamed column either.
- Some releases fail every request after they are switched in, and must be undone.

The deployment is on the canvas as it was that day. Change how billing ships.`,
  baseline: graph(
    [
      accounts(),
      node("ingress", "ingress", "Ingress"),
      node("billing-svc", "k8s-service", "billing"),
      node("billing", "k8s-deployment", "Billing", {
        replicas: 2,
        capacityRpsPerReplica: 500,
        strategy: "blue-green",
        readinessProbe: true,
        schemaChanges: "breaking",
      }),
      database(),
    ],
    wiring(),
  ),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description: "1,000 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { maxP99Ms: 300, minAvailability: 0.999, forbid: ["saturated"] },
    },
    {
      id: "routine-deploy",
      title: "A routine deploy",
      description: "A healthy release with no migration rolls out a minute in.",
      visibility: "public",
      durationSeconds: 600,
      faults: [rollout("healthy", false)],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { minAvailability: 0.999 },
    },
    {
      id: "deploy-with-migration",
      title: "A deploy that changes the schema",
      description:
        "A healthy release runs its migration and rolls out a minute in. Neither version may fail a request.",
      visibility: "public",
      durationSeconds: 600,
      faults: [rollout("healthy", true)],
      slo: { p99Ms: 300, availability: 0.999 },
      expect: { minAvailability: 0.999 },
    },
    {
      id: "bad-release-after-migration",
      title: "A release that fails, after its migration ran",
      visibility: "hidden",
      durationSeconds: 600,
      faults: [rollout("broken", true)],
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
      key: "deploys-cleanly",
      title: "Ships a release with no migration without failing a request",
      weight: 15,
      check: { check: "drill-passes", drillId: "routine-deploy" },
    },
    {
      key: "migrates-without-downtime",
      title: "Ships a schema change without failing a request",
      weight: 30,
      check: { check: "drill-passes", drillId: "deploy-with-migration" },
    },
    {
      key: "can-roll-back",
      title: "Undoes a bad release even after its migration ran",
      weight: 25,
      check: { check: "drill-passes", drillId: "bad-release-after-migration" },
    },
    {
      key: "pages-on-errors",
      title: "Pages someone when billing starts failing",
      weight: 15,
      check: {
        check: "watches",
        nodeKind: "k8s-deployment",
        signal: "error-rate",
      },
    },
  ],
  interview: {
    opening:
      "Hi! Today's topic is a billing service that deploys blue-green, and a release that renamed a database column. I'd like you to make schema changes safe to ship and safe to undo. What would you like to know?",
    facts: [
      {
        topic: "Traffic",
        answer:
          "About 1,000 requests a second, 60 % reading invoices and 40 % recording payments.",
      },
      {
        topic: "Pods",
        answer:
          "Two billing pods today, each handling about 500 requests a second. A new pod takes 30 seconds to start.",
      },
      {
        topic: "How a release runs",
        answer:
          "The pipeline runs the release's migration against the database, then starts the rollout. Blue-green: the new set starts, and the service switches to it once every pod is ready.",
      },
      {
        topic: "The incident",
        answer:
          "A release renamed amount to amount_cents. The migration ran first, so every old pod failed at once, while the new set took half a minute to start. Switching back to the old set changed nothing, because it could not read the new column either.",
      },
      {
        topic: "Bad releases",
        answer:
          "A few times a year a release fails every payment, for example after a wrong currency conversion. It has to be undone within minutes.",
      },
      {
        topic: "The database",
        answer:
          "Postgres, large enough that a migration is quick. Columns can be added and backfilled while it serves traffic.",
      },
      {
        topic: "Monitoring",
        answer:
          "A Prometheus is available and scrapes whatever it is pointed at every 15 seconds. Nothing pages anyone today.",
      },
      {
        topic: "Downtime",
        answer:
          "At least 99.9 % of requests must succeed during a deploy, as at any other time.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on how a release runs its migration and why the rename broke both versions.",
      },
      {
        id: "high-level",
        minutes: 10,
        goal: "A way to change the schema that both the old and the new version can live with.",
      },
      {
        id: "deep-dive",
        minutes: 20,
        goal: "Ship and undo a release that migrates, without failing a request, and notice a bad one within minutes.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Summarise the order of a migration, when the old column can go, and how a rollback works.",
      },
    ],
    rubric: [
      {
        key: "clarifies-requirements",
        dimension: "requirements",
        title: "Clarifies how releases and migrations run",
        signals: [
          "Asks when the migration runs relative to the rollout",
          "Asks why switching back did not help",
          "Asks how fast a bad release must be undone",
        ],
        weight: 15,
      },
      {
        key: "designs-compatible-changes",
        dimension: "design",
        title: "Makes every schema change work with both versions",
        signals: [
          "Splits the rename into expand and contract: add the new column, write both, read the new, drop the old later",
          "Explains that the old version must keep working after the migration runs",
          "Says when it is safe to drop the old column",
        ],
        weight: 30,
      },
      {
        key: "ships-and-undoes",
        dimension: "delivery",
        title: "Ships so that a bad release is caught and undone",
        signals: [
          "Tries a release on a small share before all of it, such as a canary",
          "Explains why a blue-green switch sends everyone to a bad release at once",
          "Keeps capacity during the rollout with surge rather than unavailable pods",
        ],
        weight: 20,
      },
      {
        key: "watches-deploys",
        dimension: "operability",
        title: "Notices a failing release",
        signals: [
          "Pages on the billing error rate through monitoring that scrapes the pods",
          "Ties the page to a quick way back",
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
    drillIds: [
      "normal-day",
      "deploy-with-migration",
      "bad-release-after-migration",
    ],
  },
  hints: [
    {
      title: "Why did both versions break?",
      body: "The migration changed the schema before any new pod was ready, and the old version could not read it. Neither switching nor rolling back puts the old column back.",
      cost: 5,
    },
    {
      title: "Expand, then contract",
      body: "Add the new column without removing the old one, and ship code that works with both. Drop the old column only in a later release, once nothing reads it.",
      cost: 10,
    },
    {
      title: "Undo before everyone sees it",
      body: "A blue-green switch sends every request to the new set at once. A canary sends a small share first and is rolled back when it fails, which only helps if the old version still works with the migrated schema.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "Every schema change is backward compatible, by expand and contract: a rename adds the new column, writes both and drops the old one in a later release, so the old version keeps working after any migration. Releases go out as a canary behind a readiness probe, with a surge of one and none unavailable, so a release that fails is rolled back after one step and the old version takes over cleanly. Four pods carry 1,000 requests a second at half their capacity. Prometheus scrapes the billing pods, and an alert on their error rate pages someone when a release starts failing.",
    graph: graph(
      [
        accounts(),
        node("ingress", "ingress", "Ingress"),
        node("billing-svc", "k8s-service", "billing"),
        node("billing", "k8s-deployment", "Billing", {
          replicas: 4,
          capacityRpsPerReplica: 500,
          strategy: "canary",
          maxSurge: 1,
          maxUnavailable: 0,
          readinessProbe: true,
          canarySeconds: 60,
          schemaChanges: "backward-compatible",
        }),
        database(),
        node("metrics", "monitoring", "Prometheus"),
        node("failing", "alert", "Billing failing", {
          signal: "error-rate",
          forSeconds: 60,
        }),
      ],
      [
        ...wiring(),
        edge("metrics", "billing", "scrapes"),
        edge("failing", "billing", "watches"),
      ],
    ),
  },
};
