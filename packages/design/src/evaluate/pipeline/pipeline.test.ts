import { describe, expect, test } from "bun:test";

import { edge, graph, node } from "../load/fixtures";
import { evaluatePipeline } from "./evaluate-pipeline";

const stage = (id: string, props: Record<string, unknown>) =>
  node(id, "pipeline-stage", props);

const run = (design: ReturnType<typeof graph>, changedShare = 1) =>
  evaluatePipeline(design, { kind: "pipeline", changedShare });

describe("pipeline evaluator rules", () => {
  test("stages in a line add up, and stages side by side take the longest", () => {
    const line = graph(
      [
        stage("build", { stage: "build", durationMinutes: 10 }),
        stage("test", { stage: "test", durationMinutes: 20 }),
        stage("scan", { stage: "scan", durationMinutes: 5 }),
        stage("deploy", { stage: "deploy", durationMinutes: 4 }),
      ],
      [
        edge("build", "test", "pipeline-next"),
        edge("test", "scan", "pipeline-next"),
        edge("scan", "deploy", "pipeline-next"),
      ],
    );
    const fanned = graph(line.nodes, [
      edge("build", "test", "pipeline-next"),
      edge("build", "scan", "pipeline-next"),
      edge("test", "deploy", "pipeline-next"),
      edge("scan", "deploy", "pipeline-next"),
    ]);

    expect(run(line).leadTimeMinutes).toBe(39);
    expect(run(fanned).leadTimeMinutes).toBe(34);
    expect(run(fanned).stages.find((item) => item.id === "scan")).toMatchObject(
      { start: 10, end: 15 },
    );
  });

  test("runners split a stage's work and add a minute each to set up, and affected-only work shrinks with the change", () => {
    const design = graph(
      [
        stage("test", {
          stage: "test",
          durationMinutes: 40,
          parallelism: 4,
          affectedOnly: true,
        }),
      ],
      [],
    );

    expect(run(design).leadTimeMinutes).toBe(11);
    expect(run(design, 0.25).leadTimeMinutes).toBe(3.5);
  });

  test("an approval waits its full time whatever the change", () => {
    const design = graph(
      [
        stage("approve", {
          stage: "approve",
          durationMinutes: 30,
          affectedOnly: true,
          parallelism: 3,
        }),
      ],
      [],
    );

    expect(run(design, 0.1).leadTimeMinutes).toBe(30);
  });

  test("flaky stages lower the share of green runs, and retries trade time for it", () => {
    const flaky = (retries: number) =>
      run(
        graph(
          [
            stage("test", {
              stage: "test",
              durationMinutes: 10,
              flakiness: 0.2,
              retries,
            }),
          ],
          [],
        ),
      );

    expect(flaky(0).greenRate).toBeCloseTo(0.8, 6);
    expect(flaky(0).leadTimeMinutes).toBe(10);
    expect(flaky(1).greenRate).toBeCloseTo(0.96, 6);
    expect(flaky(1).leadTimeMinutes).toBe(12);
  });

  test("a deploy with no test or no scan anywhere before it is a finding", () => {
    const design = graph(
      [
        stage("build", { stage: "build" }),
        stage("test", { stage: "test" }),
        stage("deploy", { stage: "deploy" }),
      ],
      [
        edge("build", "test", "pipeline-next"),
        edge("test", "deploy", "pipeline-next"),
      ],
    );

    expect(run(design).findings.map((item) => item.kind)).toEqual([
      "unscanned-deploy",
    ]);
  });
});
