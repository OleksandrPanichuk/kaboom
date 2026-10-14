import { describe, expect, test } from "bun:test";

import { validateDesignsSearch } from "./validateDesignsSearch";

describe("validateDesignsSearch", () => {
  test("keeps a known kind and drops anything else", () => {
    expect(validateDesignsSearch({ kind: "schema" })).toEqual({
      kind: "schema",
    });
    expect(validateDesignsSearch({ kind: "system" })).toEqual({
      kind: "system",
    });
    expect(validateDesignsSearch({ kind: "sketch" })).toEqual({});
    expect(validateDesignsSearch({})).toEqual({});
  });
});
