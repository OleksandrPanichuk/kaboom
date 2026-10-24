import type { Column } from "@repo/design";
import {
  column,
  graph,
  id,
  index,
  references,
  table,
} from "@repo/design/build";
import type { ProblemContentInput } from "@repo/scoring";

const handle = (): Column => ({ ...column("handle", "varchar"), length: 30 });

const users = () =>
  table(
    "users",
    [id(), { ...handle(), unique: true }, column("bio", "text", "null")],
    [],
  );

const follows = () =>
  table(
    "follows",
    [
      column("follower_id", "bigint", "key"),
      column("followee_id", "bigint", "key"),
      { ...column("followed_at", "timestamptz"), default: { kind: "now" } },
    ],
    [
      index(["follower_id", "followed_at"]),
      index(["followee_id", "followed_at"]),
    ],
  );

const structural = [
  "keyless-table",
  "fk-type-mismatch",
  "set-null-not-nullable",
] as const;

const usersFollowUsers: {
  cardinality: "many-to-many";
  between: [string, string];
} = { cardinality: "many-to-many", between: ["users", "users"] };

export const socialFollows: ProblemContentInput = {
  slug: "social-follows",
  title: "Who follows whom",
  track: "data-model",
  difficulty: "medium",
  tags: ["many-to-many", "self-reference", "indexes", "ordering"],
  summary:
    "Model people following each other, so a profile can list who someone follows and who follows them, newest first, without scanning every follow.",
  statement: `Design the tables behind a social app's follows.

**What it does**

- A person has a handle, at most 30 characters, that nobody else has, and an optional bio.
- A person can follow any number of other people, and be followed by any number.
- A follow records when it happened.

**How it is used**

- A profile page finds a person by handle.
- It lists the people someone follows, newest follow first.
- It lists someone's followers, newest follow first.
- Some accounts have millions of followers and follow a few hundred people.

**What to watch**

- Following someone twice must be impossible, not just unlikely.
- When a person is deleted, their follows go with them, in both directions.
- Neither list may read every follow in the table, and the busy accounts make the followers list the one that hurts.

The \`users\` table is on the canvas, and a \`follows\` table with its three bare columns. Finish the model.`,
  baseline: graph([
    table("users", [
      id(),
      column("handle", "text"),
      column("bio", "text", "null"),
    ]),
    table("follows", [
      column("follower_id", "bigint"),
      column("followee_id", "bigint"),
      column("followed_at", "timestamptz"),
    ]),
  ]),
  drills: [
    {
      kind: "schema",
      id: "follow-graph",
      title: "People follow people, once",
      description:
        "A follow joins two users, the same pair cannot follow twice, and a handle is a bounded name nobody else has.",
      visibility: "public",
      requirements: {
        relationships: [usersFollowUsers],
        columns: [
          {
            table: "users",
            name: "handle",
            type: "varchar",
            unique: true,
            maxLength: 30,
            nullable: false,
          },
          { table: "follows", name: "followed_at", type: "timestamptz" },
        ],
        queries: [
          {
            id: "profile",
            title: "Find a person by handle",
            from: "users",
            by: ["handle"],
          },
        ],
      },
      expect: { forbid: [...structural] },
    },
    {
      kind: "schema",
      id: "following-list",
      title: "Who someone follows",
      description:
        "A person's follows come back newest first from an index, however many follows the table holds.",
      visibility: "public",
      requirements: {
        relationships: [usersFollowUsers],
        queries: [
          {
            id: "following",
            title: "The follows a person made, newest first",
            from: "follows",
            by: ["follower_id"],
            orderBy: ["followed_at"],
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "followers-list",
      title: "Who follows someone",
      description:
        "A person's followers come back newest first from an index of their own: the key of the pair leads with the follower.",
      visibility: "hidden",
      requirements: {
        relationships: [usersFollowUsers],
        queries: [
          {
            id: "followers",
            title: "The follows a person received, newest first",
            from: "follows",
            by: ["followee_id"],
            orderBy: ["followed_at"],
          },
        ],
      },
    },
  ],
  rubric: [
    {
      key: "follow-graph",
      title: "Relates users to users, once per pair, with bounded handles",
      weight: 40,
      check: { check: "drill-passes", drillId: "follow-graph" },
    },
    {
      key: "following-list",
      title: "Lists who someone follows, newest first, from an index",
      weight: 25,
      check: { check: "drill-passes", drillId: "following-list" },
    },
    {
      key: "followers-list",
      title: "Lists someone's followers, newest first, from an index",
      weight: 35,
      check: { check: "drill-passes", drillId: "followers-list" },
    },
  ],
  hints: [
    {
      title: "A table that points at itself",
      body: "A follow joins two rows of the same table. Give `follows` a foreign key from each of its columns to `users`, and make the pair its primary key, so the same follow cannot be stored twice.",
      cost: 5,
    },
    {
      title: "The key serves one direction",
      body: "A primary key on (follower_id, followee_id) finds one person's follows, but in the order of the key, not of the date. Adding followed_at as the second column of an index makes the newest ones the first rows it reads.",
      cost: 10,
    },
    {
      title: "And the other direction",
      body: "Followers are looked up by followee_id, and no index leads with it. An index on (followee_id, followed_at) answers the followers list, which is the one that hurts when an account has millions.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "users has a bigint key, a unique varchar(30) handle and an optional bio. follows has a primary key on (follower_id, followee_id), so the same follow cannot be stored twice, and a foreign key from each column to users that cascades, so deleting a person removes their follows in both directions. Two indexes, (follower_id, followed_at) and (followee_id, followed_at), return either list newest first by reading the first rows of the index instead of the person's whole set.",
    graph: graph(
      [users(), follows()],
      [
        references("follows", "follower_id", "users", "cascade"),
        references("follows", "followee_id", "users", "cascade"),
      ],
    ),
  },
};
