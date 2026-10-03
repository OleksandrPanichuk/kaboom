import { describe, expect, test } from "bun:test";

import { runLints } from "../../lints";
import { latencyRegression } from "../../problems/library/latency-regression";
import { ProblemContentSchema } from "../../problems/schema";
import { scoreSubmission } from "../../problems/score";
import { evaluateLoad } from "./evaluate-load";
import { edge, graph, node } from "./fixtures";

const watched = (options: { scraped: boolean; forSeconds?: number }) =>
  graph(
    [
      node("users", "client", { rps: 100 }),
      node("api", "service", { replicas: 1, capacityRpsPerReplica: 1_000 }),
      node("errors", "alert", {
        signal: "error-rate",
        forSeconds: options.forSeconds ?? 60,
      }),
      ...(options.scraped
        ? [node("metrics", "monitoring", { scrapeIntervalSeconds: 15 })]
        : []),
    ],
    [
      edge("users", "api"),
      edge("errors", "api", "watches"),
      ...(options.scraped ? [edge("metrics", "api", "scrapes")] : []),
    ],
  );

const apiDown = (design: ReturnType<typeof watched>) =>
  evaluateLoad(design, {
    kind: "load",
    durationSeconds: 600,
    faults: [{ kind: "node-down", nodeId: "api", at: 60 }],
  });

describe("alerts", () => {
  test("page once the signal has held for their time, plus one scrape", () => {
    const result = apiDown(watched({ scraped: true }));
    const page = result.findings.find((item) => item.kind === "alert-fired");

    expect(result.alerts).toEqual([
      { alertId: "errors", firedAt: 135, scraped: true },
    ]);
    expect(page?.message).toBe(
      "errors paged at 2:15: api's error rate stayed above 1% for 60 s.",
    );
  });

  test("never fire on a node nothing scrapes, and a lint says so", () => {
    const design = watched({ scraped: false });

    expect(apiDown(design).alerts).toEqual([
      { alertId: "errors", firedAt: null, scraped: false },
    ]);
    expect(runLints(design).map((hit) => hit.lint)).toContain(
      "unscraped-alert",
    );
    expect(
      runLints(watched({ scraped: true })).map((hit) => hit.lint),
    ).not.toContain("unscraped-alert");
  });

  test("stay quiet when the signal recovers before their time is up", () => {
    const result = evaluateLoad(watched({ scraped: true, forSeconds: 120 }), {
      kind: "load",
      durationSeconds: 600,
      faults: [{ kind: "node-down", nodeId: "api", at: 60, until: 120 }],
    });

    expect(result.alerts[0]?.firedAt).toBeNull();
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
