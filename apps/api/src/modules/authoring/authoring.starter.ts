import { createNode, emptyGraph } from "@repo/design";

export const starterProblem = (slug: string): Record<string, unknown> => {
  const baseline = {
    ...emptyGraph(),
    nodes: [{ ...createNode("client", { id: "users", label: "Users" }) }],
  };

  return {
    slug,
    title: "Untitled problem",
    track: "system-design",
    difficulty: "easy",
    tags: [],
    summary: "One sentence a solver reads in the problem list.",
    statement: "Describe what the solver builds, for whom, and at what scale.",
    baseline,
    drills: [
      {
        kind: "load",
        id: "normal-day",
        title: "A normal day",
        visibility: "public",
        expect: { minAvailability: 0.99 },
      },
    ],
    rubric: [
      {
        key: "serves-a-normal-day",
        title: "Serves a normal day",
        weight: 100,
        check: { check: "drill-passes", drillId: "normal-day" },
      },
    ],
    hints: [],
    reference: { graph: baseline, notes: "" },
  };
};
