import type { DraftSectionId } from "@/features/authoring/constants";

import { asContent, type DraftContent, textOf } from "./draftContent";

export type SectionState =
  | { kind: "done" }
  | { kind: "empty" }
  | { kind: "count"; count: number }
  | { kind: "label"; label: string };

const drawn = (graph: unknown) => {
  const nodes = asContent(graph).nodes;

  return Array.isArray(nodes) && nodes.length > 0;
};

const filled = (ok: boolean): SectionState =>
  ok ? { kind: "done" } : { kind: "empty" };

export const sectionState = (
  content: DraftContent,
  id: DraftSectionId,
): SectionState => {
  switch (id) {
    case "details":
      return filled(
        ["title", "slug", "summary"].every(
          (key) => textOf(content, key).trim() !== "",
        ),
      );
    case "statement":
      return filled(textOf(content, "statement").trim() !== "");
    case "baseline":
      return filled(drawn(content.baseline));
    case "reference":
      return filled(drawn(asContent(content.reference).graph));
    case "drills":
    case "rubric":
    case "hints": {
      const list = content[id];

      return { kind: "count", count: Array.isArray(list) ? list.length : 0 };
    }
    case "interview":
      return { kind: "label", label: content.interview ? "On" : "Off" };
    case "chaos":
      return {
        kind: "label",
        label: content.chaos === undefined ? "Default" : "Custom",
      };
  }
};

export const weightTotal = (rubric: unknown): number =>
  Array.isArray(rubric)
    ? rubric.reduce<number>((total, item) => {
        const weight = asContent(item).weight;

        return total + (typeof weight === "number" ? weight : 0);
      }, 0)
    : 0;
