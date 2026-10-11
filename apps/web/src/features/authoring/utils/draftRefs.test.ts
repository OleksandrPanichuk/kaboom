import { describe, expect, test } from "bun:test";

import { draftRefs } from "./draftRefs";

describe("a draft's references", () => {
  test("list its drills, and the tables, collections and item types its designs hold", () => {
    expect(
      draftRefs({
        drills: [{ id: "normal-day" }, { id: "peak" }, { id: "" }],
        baseline: {
          nodes: [
            { id: "users", kind: "table" },
            { id: "orders", kind: "collection" },
          ],
        },
        reference: {
          graph: {
            nodes: [
              { id: "users", kind: "table" },
              { id: "posts", kind: "table" },
              {
                id: "shop",
                kind: "dynamo-table",
                props: { items: [{ name: "order" }, { name: "line" }] },
              },
            ],
          },
        },
      }),
    ).toEqual({
      drill: ["normal-day", "peak"],
      table: ["users", "posts"],
      collection: ["orders"],
      item: ["order", "line"],
    });
  });

  test("find nothing in an empty draft", () => {
    expect(draftRefs({})).toEqual({
      drill: [],
      table: [],
      collection: [],
      item: [],
    });
  });
});
