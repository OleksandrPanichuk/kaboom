import { describe, expect, test } from "bun:test";

import { evaluateLoad } from "../evaluate/load";
import { OFFICIAL_PROBLEMS } from "../problems/library";
import { edge, graph, node } from "../problems/library/build";
import { drillOf } from "../problems/schema";
import { publicReport, runTests, TEST_SUITES } from "./run-tests";

const shortener = OFFICIAL_PROBLEMS.find(
  (problem) => problem.slug === "url-shortener",
)!;

const thin = graph(
  [
    node("users", "client", "Users", { rps: 10_000, readRatio: 0.95 }),
    node("api", "service", "API", {
      replicas: 2,
      capacityRpsPerReplica: 1_000,
    }),
    node("db", "sql-database", "Links"),
  ],
  [edge("users", "api", "sync-call"), edge("api", "db", "sync-call")],
);

describe("runTests", () => {
  test("passes every test of a reference solution that the rubric scores", () => {
    for (const problem of OFFICIAL_PROBLEMS) {
      const scoresChaos = problem.rubric.some(
        (item) => item.check.check === "chaos-coverage",
      );
      const failed = runTests(problem, problem.reference.graph, {
        include: "all",
      })
        .tests.filter((item) => scoresChaos || item.suite !== "chaos")
        .filter((item) => item.status !== "passed")
        .map((item) => `${problem.slug}: ${item.title}`);

      expect(failed).toEqual([]);
    }
  }, 30_000);

  test("skips the faults while the design fails a normal day", () => {
    const report = runTests(shortener, thin, { include: "public" });
    const chaos = report.tests.filter((item) => item.id.startsWith("chaos:"));

    expect(chaos.length).toBeGreaterThan(0);
    expect(chaos.every((item) => item.status === "skipped")).toBe(true);
    expect(chaos[0]?.description).toContain("A normal day");
    expect(report.summary.skipped).toBe(chaos.length);
  });

  test("draws faults from the design, in a suite of their own", () => {
    const report = runTests(shortener, shortener.reference.graph, {
      include: "public",
    });
    const chaos = report.tests.filter((item) => item.id.startsWith("chaos:"));

    expect(chaos.map((item) => item.id)).toContain("chaos:instance:api");
    expect(chaos.every((item) => item.replay !== null)).toBe(true);
    expect(chaos.find((item) => item.id === "chaos:instance:api")?.title).toBe(
      "Shortener API loses one of its 24 replicas",
    );
  });

  test("runs only what a solver may see on a run", () => {
    const report = runTests(shortener, thin, { include: "public" });

    expect(report.tests.every((item) => item.visibility === "public")).toBe(
      true,
    );
    expect(report.tests.map((item) => item.id)).not.toContain(
      "drill:primary-fails",
    );
    const publicDrills = new Set(
      shortener.drills
        .filter((drill) => drill.visibility === "public")
        .map((drill) => drill.id),
    );

    for (const item of report.tests.filter((test) =>
      test.id.startsWith("check:"),
    )) {
      const rubric = shortener.rubric.find(
        (entry) => `check:${entry.key}` === item.id,
      )!;

      expect(publicDrills.has(drillOf(rubric.check) ?? "")).toBe(true);
    }
  });

  test("groups the tests by suite, in suite order", () => {
    const report = runTests(shortener, thin, { include: "all" });
    const order = report.tests.map((item) => TEST_SUITES.indexOf(item.suite));

    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(
      report.tests.find((item) => item.id === "drill:primary-fails")?.suite,
    ).toBe("faults");
    expect(
      report.tests.find((item) => item.id === "drill:normal-day")?.suite,
    ).toBe("load");
  });

  test("says what failed, against what it expected, when, and where", () => {
    const report = runTests(shortener, thin, { include: "public" });
    const day = report.tests.find((item) => item.id === "drill:normal-day")!;
    const failed = day.assertions.find(
      (item) => !item.passed && item.label.startsWith("Requests served"),
    )!;

    expect(day.status).toBe("failed");
    expect(failed.expected).toMatch(/^[≤≥] /);
    expect(failed.actual).not.toBe(failed.expected);
    expect(failed.at).not.toBeNull();
    expect(failed.nodeIds).toContain("users");
    expect(failed.nodeIds).toContain("api");
    expect(failed.message).toContain("Users");
  });

  test("hands back a scenario that replays to the same numbers", () => {
    const report = runTests(shortener, thin, { include: "public" });
    const day = report.tests.find((item) => item.id === "drill:normal-day")!;
    const worst = day.assertions.find(
      (item) => item.label === "Worst p99 for Users",
    )!;
    const replayed = evaluateLoad(thin, day.replay!);
    const step = replayed.steps.find((item) => item.t === worst.at)!;

    expect(`${Math.round(step.clients.users!.p99)} ms`).toBe(worst.actual);
  });

  test("keeps a hidden test's status and nothing else when made public", () => {
    const report = publicReport(runTests(shortener, thin, { include: "all" }));
    const hidden = report.tests.filter((item) => item.visibility === "hidden");

    expect(hidden.length).toBeGreaterThan(0);

    for (const item of hidden) {
      expect(item.assertions).toEqual([]);
      expect(item.replay).toBeNull();
      expect(item.description).toBe("");
      expect(item.suite).toBe("hidden");
      expect(item.durationMs).toBe(0);
    }
  });
});
