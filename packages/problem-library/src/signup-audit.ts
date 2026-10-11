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

const accounts = () =>
  within(
    "app",
    table(
      "accounts",
      [
        identity(),
        { ...column("email", "varchar"), length: 254 },
        {
          ...column("status", "enum"),
          values: ["active", "suspended", "closed"],
          default: { kind: "literal", value: "active" },
        },
        { ...column("created_at", "timestamptz"), default: { kind: "now" } },
      ],
      [{ id: "email_idx", columns: ["email"], unique: true, lower: ["email"] }],
    ),
  );

const auditEvents = () =>
  within(
    "app",
    table(
      "audit_events",
      [
        identity(),
        column("account_id", "bigint"),
        column("action", "text"),
        { ...column("occurred_at", "timestamptz"), default: { kind: "now" } },
      ],
      [
        {
          id: "account_time_idx",
          columns: ["account_id", "occurred_at"],
          unique: false,
        },
      ],
    ),
  );

const app = () => database("app", "App", "postgres");

const structural = [
  "keyless-table",
  "fk-type-mismatch",
  "set-null-not-nullable",
  "engine-unsupported",
] as const;

const accountsHaveEvents = {
  cardinality: "one-to-many",
  parent: "accounts",
  child: "audit_events",
} as const;

export const signupAudit: ProblemContentInput = {
  slug: "signup-audit",
  title: "Sign-up and an audit log",
  track: "data-model",
  difficulty: "medium",
  tags: ["postgresql", "defaults", "identity", "case-insensitive"],
  summary:
    "Model accounts that sign up by email and an audit log of what each one did, with the database filling in what it can by itself.",
  statement: `Design the PostgreSQL tables behind sign-up and an audit log.

**What it does**

- A person signs up with an email address. An account is active, suspended or closed, and starts active.
- Every change to an account is written to an audit log: what happened and when.

**How it is used**

- Signing in looks the account up by email, whatever case the person types it in: \`Ann@Example.com\` and \`ann@example.com\` are one account.
- An account's page shows its audit log, newest first.

**What to watch**

- Nobody should have to send an id or a timestamp: the database numbers the rows and stamps them.
- An email address is at most 254 characters.
- Two accounts never share an email, in any case.

The \`accounts\` and \`audit_events\` tables are in the \`App\` database with only their keys.`,
  baseline: graph(
    [
      within("app", table("accounts", [id()])),
      within("app", table("audit_events", [id()])),
    ],
    [],
    [app()],
  ),
  drills: [
    {
      kind: "schema",
      id: "sign-up",
      title: "Signing up and signing in",
      description:
        "Ids number themselves, an email is bounded, an account is stamped when it signs up, and signing in finds it by email in any case.",
      visibility: "public",
      requirements: {
        relationships: [accountsHaveEvents],
        columns: [
          { table: "accounts", name: "id", generatesItself: true },
          { table: "accounts", name: "email", maxLength: 254 },
          { table: "accounts", name: "created_at", defaultsTo: "now" },
        ],
        queries: [
          {
            id: "sign-in",
            title: "Find an account by email, whatever its case",
            from: "accounts",
            match: { column: "email", kind: "case-insensitive" },
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "audit",
      title: "The audit log",
      description:
        "Each event belongs to an account, is numbered and stamped by the database, and an account's events come back newest first from an index.",
      visibility: "public",
      requirements: {
        relationships: [accountsHaveEvents],
        columns: [
          { table: "audit_events", name: "id", generatesItself: true },
          { table: "audit_events", name: "occurred_at", defaultsTo: "now" },
        ],
        queries: [
          {
            id: "account-log",
            title: "An account's audit log, newest first",
            from: "accounts",
            by: ["id"],
            to: "audit_events",
            orderBy: ["occurred_at"],
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "statuses",
      title: "Only the statuses there are",
      visibility: "hidden",
      requirements: {
        relationships: [accountsHaveEvents],
        columns: [
          {
            table: "accounts",
            name: "status",
            values: ["active", "suspended", "closed"],
          },
        ],
      },
      expect: { forbid: [...structural] },
    },
  ],
  rubric: [
    {
      key: "sign-up",
      title:
        "Lets the database fill in ids and dates, and finds an email in any case",
      weight: 40,
      check: { check: "drill-passes", drillId: "sign-up" },
    },
    {
      key: "audit",
      title: "Keeps an audit log an account's page reads from an index",
      weight: 35,
      check: { check: "drill-passes", drillId: "audit" },
    },
    {
      key: "statuses",
      title: "Allows only real statuses, with sound keys",
      weight: 25,
      check: { check: "drill-passes", drillId: "statuses" },
    },
  ],
  hints: [
    {
      title: "Who fills in the id and the date?",
      body: "An identity column numbers rows by itself, and a default of now stamps them, so an insert names neither.",
      cost: 5,
    },
    {
      title: "Ann@Example.com",
      body: "An index on the email answers `email = ?` exactly as typed. To find it in any case, index `lower(email)`, and make that index unique so two cases of one address cannot both sign up.",
      cost: 10,
    },
    {
      title: "Three statuses",
      body: "A text column takes any word. An enum, or a check that lists the values, takes only the statuses there are.",
      cost: 10,
    },
  ],
  reference: {
    notes:
      "Both ids are identities and both timestamps default to now. The email is a varchar(254) with a unique index on lower(email), which serves the sign-in lookup in any case and stops two cases of one address. The status is an enum of the three values, active by default. audit_events references its account and has an index on (account_id, occurred_at) for the account's log.",
    graph: graph(
      [accounts(), auditEvents()],
      [references("audit_events", "account_id", "accounts")],
      [app()],
    ),
  },
};
