import { describe, expect, test } from "bun:test";

import {
  asContent,
  formatPath,
  sectionOf,
  withGraphsFrom,
} from "./draftContent";

describe("draft content", () => {
  test("reads anything that is not an object as empty", () => {
    expect(asContent(null)).toEqual({});
    expect(asContent([1])).toEqual({});
    expect(asContent({ title: "x" })).toEqual({ title: "x" });
  });

  test("files an issue under the section that holds its field", () => {
    expect(sectionOf(["slug"])).toBe("details");
    expect(sectionOf(["drills", 2, "requirements"])).toBe("drills");
    expect(sectionOf(["reference", "graph"])).toBe("reference");
    expect(sectionOf(["chaos"])).toBe("advanced");
    expect(sectionOf([])).toBe("details");
  });

  test("writes a path the way the API does", () => {
    expect(formatPath(["drills", 2, "requirements", "queries", 0])).toBe(
      "drills[2].requirements.queries[0]",
    );
  });

  test("keeps local edits but takes the graphs the designs hold", () => {
    expect(
      withGraphsFrom(
        {
          title: "Local",
          baseline: "old",
          reference: { graph: "old", notes: "mine" },
        },
        {
          title: "Server",
          baseline: "new",
          reference: { graph: "new", notes: "theirs" },
        },
      ),
    ).toEqual({
      title: "Local",
      baseline: "new",
      reference: { graph: "new", notes: "mine" },
    });
  });
});
