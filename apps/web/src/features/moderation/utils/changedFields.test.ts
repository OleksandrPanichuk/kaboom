import { describe, expect, test } from "bun:test";

import { changedFields } from "./changedFields";

describe("changed fields", () => {
  test("name each top-level field that differs, added or removed", () => {
    expect(
      changedFields(
        { title: "New", drills: [1], chaos: { on: true } },
        { title: "Old", drills: [1], hints: [] },
      ),
    ).toEqual(["chaos", "hints", "title"]);
  });

  test("find nothing when the content is the same", () => {
    expect(changedFields({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toEqual(
      [],
    );
  });
});
