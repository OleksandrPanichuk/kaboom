import { evaluateLoad, HANDBOOK_ARTICLES } from "@repo/design";
import { graph, node } from "@repo/design/build";
import { ProblemContentSchema, scoreSubmission } from "@repo/scoring";
import { describe, expect, test } from "bun:test";

import { OFFICIAL_PROBLEMS } from ".";
import { latencyRegression } from "./latency-regression";

describe("official problems", () => {
  test("round-trip through their stored JSON unchanged", () => {
    for (const problem of OFFICIAL_PROBLEMS) {
      const json: unknown = JSON.parse(JSON.stringify(problem));

      expect(ProblemContentSchema.parse(json)).toEqual(problem);
    }
  });

  test("include every problem the handbook points to", () => {
    const slugs = OFFICIAL_PROBLEMS.map((problem) => problem.slug);

    for (const article of HANDBOOK_ARTICLES) {
      for (const slug of article.problems) expect(slugs).toContain(slug);
    }
  });
});

describe("a budget on a problem", () => {
  const shortener = OFFICIAL_PROBLEMS.find(
    (problem) => problem.slug === "url-shortener",
  )!;
  const budget = (design: ReturnType<typeof graph>) =>
    scoreSubmission(shortener, design).items.find(
      (item) => item.key === "fits-the-budget",
    )!;

  test("is met by the reference", () => {
    expect(budget(shortener.reference.graph).passed).toBe(true);
  });

  test("names what costs the most when it is blown", () => {
    const lavish = {
      ...shortener.reference.graph,
      nodes: shortener.reference.graph.nodes.map((item) =>
        item.id === "api"
          ? { ...item, props: { ...item.props, replicas: 100 } }
          : item,
      ),
    } as typeof shortener.reference.graph;
    const item = budget(lavish);

    expect(item.passed).toBe(false);
    expect(item.evidence).toContain("over the $4,000 budget");
    expect(item.evidence).toContain("Shortener API $5,600");
  });

  test("waits for a design that works", () => {
    const empty = graph(
      [node("users", "client", "Users", { rps: 10_000 })],
      [],
    );

    expect(budget(empty)).toMatchObject({ passed: false });
    expect(budget(empty).evidence).toContain("once “A normal day” passes");
  });
});

describe("a watches check", () => {
  test("fails when the alert's target is not scraped, since it could never fire", () => {
    const content = ProblemContentSchema.parse(latencyRegression);
    const unscraped = {
      ...content.reference.graph,
      edges: content.reference.graph.edges.filter(
        (item) => item.kind !== "scrapes",
      ),
    };
    const item = (design: typeof unscraped) =>
      scoreSubmission(content, design).items.find(
        (entry) => entry.key === "pages-on-latency",
      );

    expect(item(content.reference.graph)?.passed).toBe(true);
    expect(item(unscraped)).toMatchObject({ passed: false });
    expect(item(unscraped)?.evidence).toContain("nothing scrapes");
    expect(
      scoreSubmission(content, unscraped).items.find(
        (entry) => entry.key === "pages-within-minutes",
      )?.passed,
    ).toBe(false);
  });
});

describe("a stalled rollout and its autoscaler", () => {
  test("keeps growing with the traffic, as a pod autoscaler does on a stuck deployment", () => {
    const problem = OFFICIAL_PROBLEMS.find(
      (item) => item.slug === "zero-downtime-rollout",
    )!;
    const result = evaluateLoad(problem.reference.graph, {
      kind: "load",
      durationSeconds: 1_200,
      traffic: [{ at: 700, multiplier: 1.5 }],
      faults: [
        {
          kind: "rollout",
          nodeId: "checkout",
          at: 60,
          release: "never-ready",
        },
      ],
    });
    const last = result.steps.at(-1)!;

    expect(last.nodes.checkout!.rollout!.phase).toBe("stalled");
    expect(last.nodes.checkout!.replicas).toBeGreaterThan(6);
    expect(last.clients.shoppers!.availability).toBe(1);
  });
});
