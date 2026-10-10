import type { ProblemContentInput } from "../schema";
import { column, graph, id, index, references, table } from "./build";

const users = () =>
  table("users", [
    id(),
    column("email", "text", "unique"),
    column("name", "text"),
  ]);

const posts = () =>
  table(
    "posts",
    [
      id(),
      column("author_id", "bigint"),
      column("title", "text"),
      column("body", "text"),
      column("created_at", "timestamptz"),
    ],
    [index(["author_id", "created_at"])],
  );

const tags = () => table("tags", [id(), column("name", "text", "unique")]);

const postTags = () =>
  table(
    "post_tags",
    [column("post_id", "bigint", "key"), column("tag_id", "bigint", "key")],
    [index(["tag_id"])],
  );

export const blogTags: ProblemContentInput = {
  slug: "blog-tags",
  title: "Blog with tags",
  track: "data-model",
  difficulty: "easy",
  tags: ["relationships", "junction-table", "indexes"],
  summary:
    "Model a blog where people write posts and tag them, so a post's tags and a tag's posts are both one query away.",
  statement: `Design the database of a blogging platform.

**What it does**

- A person signs up with an email address and writes posts.
- Each post has a title, a body and the time it was written.
- A post carries any number of tags, and a tag is shared by many posts.

**How it is used**

- An author's page lists their posts, newest first.
- A post's page shows its tags.
- A tag's page lists every post that carries it.
- Signing in finds a person by their email.

**What to watch**

- One email belongs to one person.
- A post cannot carry the same tag twice.
- None of the pages above may read a whole table to answer.

The \`users\`, \`posts\` and \`tags\` tables are on the canvas with only their keys. Give them their columns and relate them.`,
  baseline: graph([
    table("users", [id()]),
    table("posts", [id()]),
    table("tags", [id()]),
  ]),
  drills: [
    {
      kind: "schema",
      id: "authors",
      title: "Authors and their posts",
      description:
        "Each post has one author, and an author's posts come back newest first from an index.",
      visibility: "public",
      requirements: {
        relationships: [
          { cardinality: "one-to-many", parent: "users", child: "posts" },
        ],
        columns: [
          { table: "users", name: "email", type: "text", unique: true },
          { table: "posts", name: "created_at", type: "timestamptz" },
        ],
        queries: [
          {
            id: "sign-in",
            title: "Find a person by email",
            from: "users",
            by: ["email"],
          },
          {
            id: "author-page",
            title: "An author's posts, newest first",
            from: "users",
            by: ["id"],
            to: "posts",
            orderBy: ["created_at"],
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "tagging",
      title: "Posts and their tags",
      description:
        "A post carries many tags and a tag many posts, never the same pair twice, and both directions are served by an index.",
      visibility: "public",
      requirements: {
        relationships: [
          { cardinality: "many-to-many", between: ["posts", "tags"] },
        ],
        columns: [{ table: "tags", name: "name", type: "text", unique: true }],
        queries: [
          {
            id: "post-tags",
            title: "A post's tags",
            from: "posts",
            by: ["id"],
            to: "tags",
          },
          {
            id: "tag-page",
            title: "Every post with a tag",
            from: "tags",
            by: ["id"],
            to: "posts",
          },
        ],
      },
    },
    {
      kind: "schema",
      id: "sound-keys",
      title: "Every key holds",
      visibility: "hidden",
      requirements: {
        relationships: [
          { cardinality: "one-to-many", parent: "users", child: "posts" },
          { cardinality: "many-to-many", between: ["posts", "tags"] },
        ],
        queries: [
          {
            id: "tag-by-name",
            title: "Find a tag by name",
            from: "tags",
            by: ["name"],
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
      key: "authors",
      title:
        "Gives each post one author and lists an author's posts from an index",
      weight: 35,
      check: { check: "drill-passes", drillId: "authors" },
    },
    {
      key: "tagging",
      title: "Links posts and tags many to many, both ways indexed",
      weight: 40,
      check: { check: "drill-passes", drillId: "tagging" },
    },
    {
      key: "sound-keys",
      title: "Keeps every key and foreign key sound",
      weight: 25,
      check: { check: "drill-passes", drillId: "sound-keys" },
    },
  ],
  hints: [
    {
      title: "Where does the author go?",
      body: "A post has one author and an author many posts, so the post holds the reference: a column on posts that points at users.",
      cost: 5,
    },
    {
      title: "A post has many tags, a tag many posts",
      body: "Neither table can hold the other's id, because each would need a list. A third table with one row per post and tag holds the link, and its pair of columns is its primary key.",
      cost: 10,
    },
    {
      title: "Which way does the index go?",
      body: "A two-column primary key answers lookups by its first column only. The other direction needs an index of its own, and the author's page needs one that leads with the author and then the time.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "Posts reference their author. A post_tags table links posts and tags, keyed by the pair, so a post cannot carry a tag twice; its key answers a post's tags and an index on tag_id answers a tag's posts. An index on posts (author_id, created_at) lists an author's posts newest first, and email and tag names are unique.",
    graph: graph(
      [users(), posts(), tags(), postTags()],
      [
        references("posts", "author_id", "users"),
        references("post_tags", "post_id", "posts", "cascade"),
        references("post_tags", "tag_id", "tags", "cascade"),
      ],
    ),
  },
};
