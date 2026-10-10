import { describe, expect, test } from "bun:test";

import { type DesignGraph, emptyGraph } from "../graph";
import { column, index, references, table } from "./fixtures";
import { indexedBy, isOneToOne, relationsOf, uniqueOver } from "./tables";

const tags = table(
  "post_tags",
  [
    column("post_id", "bigint", { primaryKey: true }),
    column("tag_id", "bigint", { primaryKey: true }),
    column("added_at", "timestamptz"),
  ],
  [index("by_tag", ["tag_id", "added_at"])],
);

describe("tables", () => {
  test("a lookup is indexed when its columns lead a key or an index, in any order", () => {
    expect(indexedBy(tags, ["post_id"])).toBe(true);
    expect(indexedBy(tags, ["tag_id", "post_id"])).toBe(true);
    expect(indexedBy(tags, ["tag_id"])).toBe(true);
    expect(indexedBy(tags, ["added_at"])).toBe(false);
    expect(indexedBy(tags, [])).toBe(false);
  });

  test("a set of columns is unique when it holds a whole unique key", () => {
    expect(uniqueOver(tags, ["post_id", "tag_id"])).toBe(true);
    expect(uniqueOver(tags, ["post_id"])).toBe(false);
  });

  test("a relation is one-to-one when its foreign key is unique", () => {
    const graph: DesignGraph = {
      ...emptyGraph(),
      nodes: [
        table("users", [column("id", "bigint", { primaryKey: true })]),
        table("profiles", [
          column("id", "bigint", { primaryKey: true }),
          column("user_id", "bigint", { unique: true }),
        ]),
        tags,
      ],
      edges: [],
    };

    graph.nodes.push(
      table("posts", [column("id", "bigint", { primaryKey: true })]),
    );
    graph.edges.push(
      references("profiles", "user_id", "users"),
      references("post_tags", "post_id", "posts"),
    );

    expect(relationsOf(graph).map((relation) => isOneToOne(relation))).toEqual([
      true,
      false,
    ]);
  });
});
