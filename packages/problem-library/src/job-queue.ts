import type { Column } from "@repo/design";
import {
  column,
  database,
  graph,
  id,
  references,
  table,
  within,
} from "@repo/design/build";
import type { ProblemContentInput } from "@repo/scoring";

const identity = (): Column => ({
  ...id(),
  generated: { kind: "identity", always: true },
});

const STATUSES = ["pending", "running", "done", "failed"];

const jobs = () =>
  within(
    "queue",
    table(
      "jobs",
      [
        identity(),
        { ...column("queue", "varchar"), length: 64 },
        {
          ...column("status", "enum"),
          values: STATUSES,
          default: { kind: "literal", value: "pending" },
        },
        { ...column("run_at", "timestamptz"), default: { kind: "now" } },
        column("payload", "jsonb"),
        {
          ...column("attempts", "integer"),
          default: { kind: "literal", value: "0" },
          checks: { min: 0, max: 25 },
        },
      ],
      [
        {
          id: "pending_idx",
          columns: ["queue", "run_at"],
          unique: false,
          where: { column: "status", op: "=", value: "pending" },
        },
        {
          id: "payload_idx",
          columns: ["payload"],
          unique: false,
          method: "gin",
        },
      ],
    ),
  );

const jobRuns = () =>
  within(
    "queue",
    table(
      "job_runs",
      [
        identity(),
        column("job_id", "bigint"),
        { ...column("started_at", "timestamptz"), default: { kind: "now" } },
        column("finished_at", "timestamptz", "null"),
        column("error", "text", "null"),
      ],
      [
        {
          id: "job_time_idx",
          columns: ["job_id", "started_at"],
          unique: false,
        },
      ],
    ),
  );

const queue = () => database("queue", "Queue", "postgres");

const jobsHaveRuns = {
  cardinality: "one-to-many",
  parent: "jobs",
  child: "job_runs",
} as const;

export const jobQueue: ProblemContentInput = {
  slug: "job-queue",
  title: "A job queue in a table",
  track: "data-model",
  difficulty: "hard",
  tags: ["postgresql", "partial-index", "enum", "jsonb"],
  summary:
    "Keep background jobs in PostgreSQL so workers pick the next pending job of their queue without reading the ones already done.",
  statement: `Design the PostgreSQL tables of a job queue that workers poll.

**What it does**

- A job belongs to a named queue, carries a JSON payload, and is pending, running, done or failed. It is pending when it is added, and due now unless it says later.
- Each time a worker runs a job, the run is recorded: when it started, when it finished and the error, if any.
- A job is tried at most 25 times.

**How it is used**

- Every second, each worker asks for the next pending jobs of its queue, the ones due first. Done and failed jobs pile up by the million and must not slow that question down.
- A job's page lists its runs, newest first.
- Support looks for the jobs whose payload mentions a given order.

**What to watch**

- The database numbers the jobs and stamps when they are due and when a run starts.
- A status is one of the four, nothing else.

The \`jobs\` and \`job_runs\` tables are in the \`Queue\` database with only their keys.`,
  baseline: graph(
    [
      within("queue", table("jobs", [id()])),
      within("queue", table("job_runs", [id()])),
    ],
    [],
    [queue()],
  ),
  drills: [
    {
      kind: "schema",
      id: "next-job",
      title: "The next jobs to run",
      description:
        "A job's status is one of four and it is due now by default, and the next pending jobs of a queue come back in order from an index that ignores finished jobs.",
      visibility: "public",
      requirements: {
        relationships: [jobsHaveRuns],
        columns: [
          { table: "jobs", name: "status", values: STATUSES },
          { table: "jobs", name: "run_at", defaultsTo: "now" },
        ],
        queries: [
          {
            id: "poll",
            title: "The next pending jobs of a queue",
            from: "jobs",
            by: ["queue"],
            where: { column: "status", op: "=", value: "pending" },
            orderBy: ["run_at"],
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "history",
      title: "A job's runs",
      description:
        "Each run belongs to its job and is stamped when it starts, and a job's runs come back newest first from an index.",
      visibility: "public",
      requirements: {
        relationships: [jobsHaveRuns],
        columns: [
          { table: "jobs", name: "id", generatesItself: true },
          { table: "job_runs", name: "started_at", defaultsTo: "now" },
        ],
        queries: [
          {
            id: "runs",
            title: "A job's runs, newest first",
            from: "jobs",
            by: ["id"],
            to: "job_runs",
            orderBy: ["started_at"],
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "payload-search",
      title: "Searching payloads",
      visibility: "hidden",
      requirements: {
        relationships: [jobsHaveRuns],
        columns: [{ table: "jobs", name: "payload", type: "jsonb" }],
        queries: [
          {
            id: "mentions",
            title: "Jobs whose payload mentions an order",
            from: "jobs",
            match: { column: "payload", kind: "contains" },
          },
        ],
      },
      expect: {
        forbid: [
          "keyless-table",
          "fk-type-mismatch",
          "set-null-not-nullable",
          "engine-unsupported",
        ],
      },
    },
  ],
  rubric: [
    {
      key: "next-job",
      title:
        "Serves the next pending jobs from an index that skips finished ones",
      weight: 40,
      check: { check: "drill-passes", drillId: "next-job" },
    },
    {
      key: "history",
      title: "Records each run and lists a job's runs from an index",
      weight: 30,
      check: { check: "drill-passes", drillId: "history" },
    },
    {
      key: "payload-search",
      title: "Searches payloads with an index",
      weight: 30,
      check: { check: "drill-passes", drillId: "payload-search" },
    },
  ],
  hints: [
    {
      title: "Four statuses",
      body: "An enum of the four values, pending by default, keeps a typo from becoming a fifth status nobody polls.",
      cost: 5,
    },
    {
      title: "Millions of finished jobs",
      body: "An index on (queue, run_at) still holds every done job. A partial index, `WHERE status = 'pending'`, holds only what a worker can pick, so it stays small however many jobs finish.",
      cost: 10,
    },
    {
      title: "Inside the payload",
      body: "A btree cannot look inside a document. A GIN index on a jsonb column answers containment, such as `payload @> '{\"order\": 42}'`; a json column cannot have one.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "jobs has an identity id, a bounded queue name, a status enum that starts pending, run_at defaulting to now, a jsonb payload with a GIN index, and attempts checked between 0 and 25. A partial index on (queue, run_at) where status = 'pending' serves the workers' poll and holds only pending jobs. job_runs references its job, is stamped when it starts, and has an index on (job_id, started_at).",
    graph: graph(
      [jobs(), jobRuns()],
      [references("job_runs", "job_id", "jobs", "cascade")],
      [queue()],
    ),
  },
};
