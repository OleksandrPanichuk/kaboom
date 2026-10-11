import { describe, expect, test } from "bun:test";

import { sectionState, weightTotal } from "./draftSections";

describe("a draft's sections", () => {
  test("say what each holds", () => {
    const content = {
      title: "Short links",
      slug: "short-links",
      summary: "",
      statement: "Build it",
      baseline: { nodes: [] },
      reference: { graph: { nodes: [{ id: "a" }] } },
      drills: [{}, {}],
    };

    expect(sectionState(content, "details")).toEqual({ kind: "empty" });
    expect(sectionState(content, "statement")).toEqual({ kind: "done" });
    expect(sectionState(content, "baseline")).toEqual({ kind: "empty" });
    expect(sectionState(content, "reference")).toEqual({ kind: "done" });
    expect(sectionState(content, "drills")).toEqual({
      kind: "count",
      count: 2,
    });
    expect(sectionState(content, "hints")).toEqual({ kind: "count", count: 0 });
    expect(sectionState(content, "interview")).toEqual({
      kind: "label",
      label: "Off",
    });
    expect(sectionState(content, "chaos")).toEqual({
      kind: "label",
      label: "Default",
    });
  });

  test("add up the rubric's weights", () => {
    expect(weightTotal([{ weight: 60 }, { weight: 25 }, {}])).toBe(85);
    expect(weightTotal(undefined)).toBe(0);
  });
});
