import type { ProblemContentInput } from "../schema";
import { column, graph, id, index, references, table } from "./build";

const tenants = () => table("tenants", [id(), column("name", "text")]);

const users = () =>
  table("users", [
    id(),
    column("email", "text", "unique"),
    column("name", "text"),
  ]);

const rooms = () =>
  table(
    "rooms",
    [
      id(),
      column("tenant_id", "bigint"),
      column("name", "text"),
      column("seats", "integer"),
    ],
    [index(["tenant_id", "name"])],
  );

const bookings = () =>
  table(
    "bookings",
    [
      id(),
      column("room_id", "bigint"),
      column("booked_by", "bigint"),
      column("starts_at", "timestamptz"),
      column("ends_at", "timestamptz"),
    ],
    [index(["room_id", "starts_at"]), index(["booked_by", "starts_at"])],
  );

const billingProfiles = () =>
  table("billing_profiles", [
    id(),
    column("tenant_id", "bigint", "unique"),
    column("vat_number", "text", "null"),
  ]);

const memberships = () =>
  table(
    "memberships",
    [
      column("tenant_id", "bigint", "key"),
      column("user_id", "bigint", "key"),
      column("role", "text"),
    ],
    [index(["user_id"])],
  );

export const roomBooking: ProblemContentInput = {
  slug: "room-booking",
  title: "Meeting rooms for many companies",
  track: "data-model",
  difficulty: "hard",
  tags: ["multi-tenant", "relationships", "one-to-one", "composite-keys"],
  summary:
    "Model a meeting-room service shared by many companies, where one person may work for several of them with a different role in each.",
  statement: `Design the database of a service that companies use to book their meeting rooms.

**What it does**

- Each company, a tenant, has its rooms, and each room its bookings, each with a start, an end and the person who made it.
- A person signs in once with their email and may belong to several tenants, as an admin in one and a member in another.
- Each tenant has exactly one billing profile.

**How it is used**

- An office's screen lists a tenant's rooms by name, and a room's bookings by start time.
- A person's home page lists the tenants they belong to and their own bookings, soonest first.
- An admin's page lists a tenant's members.
- Signing in finds a person by email.

**What to watch**

- A person's role depends on the tenant: it cannot live on the person.
- A tenant never has two billing profiles.
- None of the pages above may read a whole table.

The \`tenants\`, \`users\`, \`rooms\`, \`bookings\` and \`billing_profiles\` tables are on the canvas with only their keys.`,
  baseline: graph([
    table("tenants", [id()]),
    table("users", [id()]),
    table("rooms", [id()]),
    table("bookings", [id()]),
    table("billing_profiles", [id()]),
  ]),
  drills: [
    {
      kind: "schema",
      id: "rooms",
      title: "Rooms and their bookings",
      description:
        "A tenant's rooms by name and a room's bookings by start time each come back from an index.",
      visibility: "public",
      requirements: {
        relationships: [
          { cardinality: "one-to-many", parent: "tenants", child: "rooms" },
          { cardinality: "one-to-many", parent: "rooms", child: "bookings" },
        ],
        columns: [
          { table: "rooms", name: "name", type: "text" },
          { table: "bookings", name: "starts_at", type: "timestamptz" },
          { table: "bookings", name: "ends_at", type: "timestamptz" },
        ],
        queries: [
          {
            id: "office-screen",
            title: "A tenant's rooms by name",
            from: "tenants",
            by: ["id"],
            to: "rooms",
            orderBy: ["name"],
          },
          {
            id: "room-screen",
            title: "A room's bookings by start time",
            from: "rooms",
            by: ["id"],
            to: "bookings",
            orderBy: ["starts_at"],
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "people",
      title: "People in several tenants",
      description:
        "A person belongs to many tenants and a tenant has many people, both ways indexed, and a person is found by email.",
      visibility: "public",
      requirements: {
        relationships: [
          { cardinality: "many-to-many", between: ["users", "tenants"] },
        ],
        columns: [
          { table: "users", name: "email", type: "text", unique: true },
        ],
        queries: [
          {
            id: "sign-in",
            title: "Find a person by email",
            from: "users",
            by: ["email"],
          },
          {
            id: "my-tenants",
            title: "The tenants a person belongs to",
            from: "users",
            by: ["id"],
            to: "tenants",
          },
          {
            id: "members",
            title: "A tenant's members",
            from: "tenants",
            by: ["id"],
            to: "users",
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "billing-and-bookings",
      title: "Billing and a person's bookings",
      visibility: "hidden",
      requirements: {
        relationships: [
          {
            cardinality: "one-to-one",
            between: ["tenants", "billing_profiles"],
          },
          { cardinality: "one-to-many", parent: "users", child: "bookings" },
        ],
        queries: [
          {
            id: "my-bookings",
            title: "A person's bookings, soonest first",
            from: "users",
            by: ["id"],
            to: "bookings",
            orderBy: ["starts_at"],
          },
        ],
      },
      expect: {
        forbid: ["keyless-table", "fk-type-mismatch", "set-null-not-nullable"],
      },
    },
  ],
  rubric: [
    {
      key: "rooms",
      title:
        "Relates tenants, rooms and bookings, and serves the screens from indexes",
      weight: 35,
      check: { check: "drill-passes", drillId: "rooms" },
    },
    {
      key: "people",
      title: "Lets a person belong to many tenants, indexed both ways",
      weight: 40,
      check: { check: "drill-passes", drillId: "people" },
    },
    {
      key: "billing-and-bookings",
      title:
        "Gives each tenant one billing profile and lists a person's bookings",
      weight: 25,
      check: { check: "drill-passes", drillId: "billing-and-bookings" },
    },
  ],
  hints: [
    {
      title: "Where does the role go?",
      body: "A person has a role per tenant, so the role belongs to the link between them: a memberships table with one row per tenant and person.",
      cost: 5,
    },
    {
      title: "Exactly one billing profile",
      body: "A foreign key from billing_profiles to tenants allows many profiles per tenant until the column is unique.",
      cost: 10,
    },
    {
      title: "One index cannot serve both ways",
      body: "A key on (tenant_id, user_id) lists a tenant's members, but finding a person's tenants needs an index that leads with user_id. The same goes for bookings: by room and by person each want their own index, each followed by the start time.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "Rooms reference their tenant, and bookings their room and the person who booked. A memberships table keyed by (tenant_id, user_id) carries the role, with an index on user_id for a person's tenants. billing_profiles holds a unique tenant_id, so each tenant has one. Indexes on rooms (tenant_id, name), bookings (room_id, starts_at) and bookings (booked_by, starts_at) serve the screens.",
    graph: graph(
      [
        tenants(),
        users(),
        rooms(),
        bookings(),
        billingProfiles(),
        memberships(),
      ],
      [
        references("rooms", "tenant_id", "tenants"),
        references("bookings", "room_id", "rooms", "cascade"),
        references("bookings", "booked_by", "users"),
        references("billing_profiles", "tenant_id", "tenants", "cascade"),
        references("memberships", "tenant_id", "tenants", "cascade"),
        references("memberships", "user_id", "users", "cascade"),
      ],
    ),
  },
};
