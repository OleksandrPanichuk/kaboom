import { describe, expect, test } from "bun:test";

import type { TableNode } from "../../data-model";
import { column, index, references, table } from "../../data-model/fixtures";
import { type DesignEdge, emptyGraph } from "../../graph";
import { evaluateSchema } from "./evaluate-schema";
import { SchemaRequirementsSchema } from "./requirements";

const graphOf = (nodes: TableNode[], edges: DesignEdge[]) => ({
  ...emptyGraph(),
  nodes,
  edges,
});

const users = () =>
  table("users", [
    column("id", "bigint", { primaryKey: true }),
    column("email", "text", { unique: true }),
  ]);

const posts = (indexes = [index("by_author", ["author_id", "created_at"])]) =>
  table(
    "posts",
    [
      column("id", "bigint", { primaryKey: true }),
      column("author_id", "bigint"),
      column("created_at", "timestamptz"),
    ],
    indexes,
  );

const tags = () =>
  table("tags", [
    column("id", "bigint", { primaryKey: true }),
    column("name", "text", { unique: true }),
  ]);

const postTags = (
  key: "pair" | "surrogate" = "pair",
  indexes = [index("by_tag", ["tag_id"])],
) =>
  table(
    "post_tags",
    key === "pair"
      ? [
          column("post_id", "bigint", { primaryKey: true }),
          column("tag_id", "bigint", { primaryKey: true }),
        ]
      : [
          column("id", "bigint", { primaryKey: true }),
          column("post_id", "bigint"),
          column("tag_id", "bigint"),
        ],
    indexes,
  );

const blog = () =>
  graphOf(
    [users(), posts(), tags(), postTags()],
    [
      references("posts", "author_id", "users"),
      references("post_tags", "post_id", "posts"),
      references("post_tags", "tag_id", "tags"),
    ],
  );

const evaluate = (graph: ReturnType<typeof graphOf>, requirements: unknown) =>
  evaluateSchema(graph, SchemaRequirementsSchema.parse(requirements));

const verdicts = (result: ReturnType<typeof evaluate>) =>
  result.checks.map((check) => [check.label, check.passed, check.finding]);

describe("relationships", () => {
  test("one-to-many asks for a foreign key on the child that is not unique", () => {
    const requirement = {
      relationships: [
        { cardinality: "one-to-many", parent: "users", child: "posts" },
      ],
    } as const;

    expect(verdicts(evaluate(blog(), requirement))).toEqual([
      ["users to posts, one to many", true, null],
    ]);

    const unique = blog();

    unique.nodes[1] = table("posts", [
      column("id", "bigint", { primaryKey: true }),
      column("author_id", "bigint", { unique: true }),
    ]);

    expect(evaluate(unique, requirement).checks[0]?.finding).toBe(
      "wrong-cardinality",
    );
  });

  test("one-to-many refuses a foreign key pointing the wrong way, and notices none at all", () => {
    const backwards = graphOf(
      [
        table("users", [
          column("id", "bigint", { primaryKey: true }),
          column("post_id", "bigint"),
        ]),
        posts(),
      ],
      [references("users", "post_id", "posts")],
    );
    const requirement = {
      relationships: [
        { cardinality: "one-to-many", parent: "users", child: "posts" },
      ],
    } as const;

    expect(evaluate(backwards, requirement).checks[0]).toMatchObject({
      passed: false,
      finding: "wrong-cardinality",
      actual: "users.post_id points the other way",
    });
    expect(
      evaluate(graphOf([users(), posts()], []), requirement).checks[0]?.finding,
    ).toBe("missing-relationship");
  });

  test("one-to-one asks for a unique foreign key in either direction", () => {
    const profile = (unique: boolean) =>
      graphOf(
        [
          users(),
          table("profiles", [
            column("id", "bigint", { primaryKey: true }),
            column("user_id", "bigint", { unique }),
          ]),
        ],
        [references("profiles", "user_id", "users")],
      );
    const requirement = {
      relationships: [
        { cardinality: "one-to-one", between: ["users", "profiles"] },
      ],
    } as const;

    expect(evaluate(profile(true), requirement).checks[0]?.passed).toBe(true);
    expect(evaluate(profile(false), requirement).checks[0]?.finding).toBe(
      "wrong-cardinality",
    );
  });

  test("many-to-many asks for a junction table whose pair is unique", () => {
    const requirement = {
      relationships: [
        { cardinality: "many-to-many", between: ["posts", "tags"] },
      ],
    } as const;
    const loose = graphOf(
      [posts(), tags(), postTags("surrogate")],
      [
        references("post_tags", "post_id", "posts"),
        references("post_tags", "tag_id", "tags"),
      ],
    );

    expect(evaluate(blog(), requirement).checks[0]).toMatchObject({
      passed: true,
      actual: "post_tags",
    });
    expect(evaluate(loose, requirement).checks[0]?.finding).toBe(
      "duplicate-links",
    );

    loose.nodes[2]!.props.indexes = [
      index("pair", ["tag_id", "post_id"], true),
    ];

    expect(evaluate(loose, requirement).checks[0]?.passed).toBe(true);
  });

  test("many-to-many refuses a direct foreign key, even beside a junction table", () => {
    const shortcut = blog();

    shortcut.nodes[1] = table("posts", [
      column("id", "bigint", { primaryKey: true }),
      column("author_id", "bigint"),
      column("tag_id", "bigint"),
    ]);
    shortcut.edges.push(references("posts", "tag_id", "tags"));

    expect(
      evaluate(shortcut, {
        relationships: [
          { cardinality: "many-to-many", between: ["posts", "tags"] },
        ],
      }).checks[0]?.finding,
    ).toBe("wrong-cardinality");
    expect(
      evaluate(graphOf([posts(), tags()], []), {
        relationships: [
          { cardinality: "many-to-many", between: ["posts", "tags"] },
        ],
      }).checks[0]?.finding,
    ).toBe("missing-junction");
  });

  test("many-to-many may join a table to itself", () => {
    const follows = graphOf(
      [
        users(),
        table("follows", [
          column("follower_id", "bigint", { primaryKey: true }),
          column("followed_id", "bigint", { primaryKey: true }),
        ]),
      ],
      [
        references("follows", "follower_id", "users"),
        references("follows", "followed_id", "users"),
      ],
    );

    expect(
      evaluate(follows, {
        relationships: [
          { cardinality: "many-to-many", between: ["users", "users"] },
        ],
      }).checks[0]?.passed,
    ).toBe(true);
  });

  test("a table the problem names and the design lost is missing", () => {
    expect(
      evaluate(graphOf([users()], []), {
        relationships: [
          { cardinality: "one-to-many", parent: "users", child: "posts" },
        ],
      }).checks[0],
    ).toMatchObject({ passed: false, finding: "missing-table" });
  });
});

describe("columns", () => {
  test("ask for a column by name, with its type and constraints", () => {
    const result = evaluate(blog(), {
      columns: [
        { table: "users", name: "Email", type: "text", unique: true },
        { table: "users", name: "name" },
        { table: "posts", name: "created_at", type: "date" },
        { table: "posts", name: "author_id", nullable: true },
      ],
    });

    expect(verdicts(result)).toEqual([
      ["users.Email", true, null],
      ["users.name", false, "missing-column"],
      ["posts.created_at", false, "column-mismatch"],
      ["posts.author_id", false, "column-mismatch"],
    ]);
    expect(result.checks[2]?.message).toBe(
      "posts.created_at is timestamptz, not date.",
    );
  });
});

describe("queries", () => {
  const relationships = [
    { cardinality: "one-to-many", parent: "users", child: "posts" },
    { cardinality: "many-to-many", between: ["posts", "tags"] },
  ] as const;

  test("a lookup must lead an index, a unique column or the primary key", () => {
    const result = evaluate(blog(), {
      queries: [
        {
          id: "by-email",
          title: "Find a user by email",
          from: "users",
          by: ["email"],
        },
        {
          id: "by-name",
          title: "Find a tag by name",
          from: "tags",
          by: ["name"],
        },
        {
          id: "by-time",
          title: "Posts at a time",
          from: "posts",
          by: ["created_at"],
        },
      ],
    });

    expect(verdicts(result)).toEqual([
      ["Find a user by email", true, null],
      ["Find a tag by name", true, null],
      ["Posts at a time", false, "unindexed-query"],
    ]);
  });

  test("following a one-to-many needs an index on the foreign key, and the order after it", () => {
    const query = {
      relationships,
      queries: [
        {
          id: "feed",
          title: "A user's posts, newest first",
          from: "users",
          by: ["id"],
          to: "posts",
          orderBy: ["created_at"],
        },
      ],
    } as const;
    const unordered = blog();

    unordered.nodes[1] = posts([index("by_author", ["author_id"])]);

    expect(evaluate(blog(), query).checks.at(-1)?.passed).toBe(true);
    expect(evaluate(unordered, query).checks.at(-1)).toMatchObject({
      passed: false,
      finding: "unindexed-query",
      actual: "posts has no index on (author_id, created_at)",
    });
  });

  test("following a many-to-many goes through its junction table, which needs an index", () => {
    const query = {
      relationships,
      queries: [
        {
          id: "tagged",
          title: "Posts with a tag",
          from: "tags",
          by: ["id"],
          to: "posts",
        },
        {
          id: "tags-of",
          title: "Tags of a post",
          from: "posts",
          by: ["id"],
          to: "tags",
        },
      ],
    } as const;
    const unindexed = blog();

    unindexed.nodes[3] = postTags("pair", []);

    expect(verdicts(evaluate(blog(), query)).slice(-2)).toEqual([
      ["Posts with a tag", true, null],
      ["Tags of a post", true, null],
    ]);
    expect(verdicts(evaluate(unindexed, query)).slice(-2)).toEqual([
      ["Posts with a tag", false, "unindexed-query"],
      ["Tags of a post", true, null],
    ]);
  });

  test("a redundant foreign key cannot stand in for the junction table on the way", () => {
    const shortcut = graphOf(
      [
        users(),
        table(
          "posts",
          [
            column("id", "bigint", { primaryKey: true }),
            column("author_id", "bigint"),
            column("tag_id", "bigint"),
          ],
          [index("by_tag", ["tag_id"])],
        ),
        tags(),
      ],
      [
        references("posts", "author_id", "users"),
        references("posts", "tag_id", "tags"),
      ],
    );

    expect(
      evaluate(shortcut, {
        relationships,
        queries: [
          {
            id: "tagged",
            title: "Posts with a tag",
            from: "tags",
            by: ["id"],
            to: "posts",
          },
        ],
      }).checks.at(-1),
    ).toMatchObject({ passed: false, finding: "missing-relationship" });
  });

  test("a query names only columns the tables have", () => {
    expect(
      evaluate(blog(), {
        queries: [{ id: "q", title: "By slug", from: "posts", by: ["slug"] }],
      }).checks[0],
    ).toMatchObject({ passed: false, finding: "missing-column" });
  });
});

describe("findings", () => {
  test("carry every failed requirement and the structural lints", () => {
    const graph = graphOf(
      [users(), table("posts", [column("author_id", "integer")])],
      [],
    );

    graph.nodes[1]!.props.columns.push(
      column("id", "bigint", { unique: true }),
    );
    graph.edges.push(references("posts", "author_id", "users"));

    const kinds = evaluate(graph, {
      columns: [{ table: "posts", name: "title" }],
    }).findings.map((finding) => finding.kind);

    expect(kinds).toEqual([
      "missing-column",
      "keyless-table",
      "fk-type-mismatch",
    ]);
  });
});
