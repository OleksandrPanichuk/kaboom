import { describe, expect, test } from "bun:test";

import { DesignOpBatchSchema } from "../ops";
import { canonicalize } from "./canonicalize";
import { DesignGraphSchema } from "./schema";

const stored = {
  schemaVersion: 1,
  nodes: [
    {
      id: "users",
      kind: "table",
      label: "users",
      groupId: null,
      notes: "",
      props: {
        columns: [
          {
            id: "id",
            name: "id",
            type: "bigint",
            nullable: false,
            primaryKey: true,
            unique: false,
          },
        ],
        indexes: [],
      },
      technology: null,
    },
    {
      id: "posts",
      kind: "table",
      label: "posts",
      groupId: null,
      notes: "",
      props: {
        columns: [
          {
            id: "id",
            name: "id",
            type: "bigint",
            nullable: false,
            primaryKey: true,
            unique: false,
          },
          {
            id: "author_id",
            name: "author_id",
            type: "bigint",
            nullable: false,
            primaryKey: false,
            unique: false,
          },
        ],
        indexes: [{ id: "i", columns: ["author_id"], unique: false }],
      },
      technology: null,
    },
  ],
  edges: [
    {
      id: "r",
      from: "posts",
      to: "users",
      kind: "relation",
      label: "",
      props: { share: 1, fanOut: 1, timeoutMs: 1000, retries: 0 },
      relation: {
        fromColumn: "author_id",
        toColumn: "id",
        onDelete: "cascade",
      },
    },
  ],
  groups: [{ id: "eu", kind: "region", label: "EU", parentId: null }],
};

describe("what was stored before production data models", () => {
  test("a design parses to exactly what was stored, so its hash does not move", () => {
    const parsed = DesignGraphSchema.parse(structuredClone(stored));

    expect(parsed).toEqual(stored as unknown as typeof parsed);
    expect(canonicalize(parsed)).toBe(
      canonicalize(stored as unknown as typeof parsed),
    );
  });

  test("a revision's ops parse as they were written", () => {
    const ops = [
      { op: "add-node", node: stored.nodes[1] },
      { op: "add-edge", edge: stored.edges[0] },
    ];

    expect(DesignOpBatchSchema.parse(structuredClone(ops))).toEqual(
      ops as never,
    );
  });
});
