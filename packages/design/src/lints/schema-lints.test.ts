import { describe, expect, test } from "bun:test";

import { column, index, references, table } from "../data-model/fixtures";
import { type DesignEdge, type DesignNode, emptyGraph } from "../graph";
import { lints } from "./lints";

const graphOf = (nodes: DesignNode[], edges: DesignEdge[] = []) => ({
  ...emptyGraph(),
  nodes,
  edges,
});

const users = () =>
  table("users", [
    column("id", "bigint", { primaryKey: true }),
    column("email", "text", { unique: true }),
  ]);

describe("schema lints", () => {
  test("no-primary-key flags a table without one", () => {
    const graph = graphOf([users(), table("logs", [column("line", "text")])]);

    expect(
      lints["no-primary-key"].run(graph).map((hit) => hit.nodeIds),
    ).toEqual([["logs"]]);
  });

  test("fk-type-mismatch flags a foreign key of another type than its key", () => {
    const graph = graphOf(
      [
        users(),
        table("posts", [
          column("id", "bigint", { primaryKey: true }),
          column("author_id", "integer"),
        ]),
      ],
      [references("posts", "author_id", "users")],
    );

    expect(lints["fk-type-mismatch"].run(graph)[0]?.message).toBe(
      "posts.author_id is integer but references users.id, a bigint; give them one type.",
    );
  });

  test("set-null-not-nullable flags set null on a column that cannot be null", () => {
    const posts = table("posts", [
      column("id", "bigint", { primaryKey: true }),
      column("author_id", "bigint"),
      column("editor_id", "bigint", { nullable: true }),
    ]);
    const graph = graphOf(
      [users(), posts],
      [
        references("posts", "author_id", "users", "id", "set-null"),
        references("posts", "editor_id", "users", "id", "set-null"),
      ],
    );

    expect(
      lints["set-null-not-nullable"].run(graph).map((hit) => hit.edgeIds),
    ).toEqual([["posts.author_id"]]);
  });

  test("unindexed-foreign-key flags a foreign key no index leads with", () => {
    const junction = table("post_tags", [
      column("post_id", "bigint", { primaryKey: true }),
      column("tag_id", "bigint", { primaryKey: true }),
    ]);
    const posts = table("posts", [
      column("id", "bigint", { primaryKey: true }),
    ]);
    const tags = table("tags", [column("id", "bigint", { primaryKey: true })]);
    const graph = graphOf(
      [junction, posts, tags],
      [
        references("post_tags", "post_id", "posts"),
        references("post_tags", "tag_id", "tags"),
      ],
    );

    expect(
      lints["unindexed-foreign-key"].run(graph).map((hit) => hit.edgeIds),
    ).toEqual([["post_tags.tag_id"]]);

    junction.props.indexes = [index("by_tag", ["tag_id"])];

    expect(lints["unindexed-foreign-key"].run(graph)).toEqual([]);
  });
});
