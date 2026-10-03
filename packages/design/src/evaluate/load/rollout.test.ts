import { describe, expect, test } from "bun:test";

import type { Release } from "../scenario";
import { evaluateLoad } from "./evaluate-load";
import { edge, graph, node } from "./fixtures";

const cluster = (deployment: Record<string, unknown>, rps = 1_500) =>
  graph(
    [
      node("users", "client", { rps }),
      node("web", "k8s-service"),
      node("app", "k8s-deployment", {
        replicas: 3,
        capacityRpsPerReplica: 1_000,
        startupSeconds: 30,
        progressDeadlineSeconds: 120,
        ...deployment,
      }),
    ],
    [edge("users", "web"), edge("web", "app")],
  );

const rollOut = (
  deployment: Record<string, unknown>,
  release: Release = "healthy",
  rps?: number,
) =>
  evaluateLoad(cluster(deployment, rps), {
    kind: "load",
    durationSeconds: 200,
    faults: [{ kind: "rollout", nodeId: "app", at: 0, release }],
  });

const availability = (result: ReturnType<typeof rollOut>) =>
  result.steps.map((step) => step.clients.users!.availability);

const phases = (result: ReturnType<typeof rollOut>) =>
  result.steps.map((step) => step.nodes.app!.rollout!.phase);

const kinds = (result: ReturnType<typeof rollOut>) =>
  result.findings.map((finding) => finding.kind);

describe("rollouts", () => {
  test("a rolling update surges one pod at a time and never drops below the replica count", () => {
    const result = rollOut({ maxSurge: 1, maxUnavailable: 0 });
    const app = result.steps.map((step) => step.nodes.app!);

    expect(app[0]!.rollout).toEqual({
      phase: "rolling",
      old: 3,
      ready: 0,
      starting: 1,
      failing: 0,
    });
    expect(app[3]!.rollout).toMatchObject({ old: 2, ready: 1, starting: 1 });
    expect(app[9]!.rollout).toMatchObject({ phase: "complete", ready: 3 });
    expect(Math.min(...app.map((step) => step.replicas!))).toBe(3);
    expect(Math.min(...availability(result))).toBe(1);
    expect(result.findings).toEqual([]);
  });

  test("taking pods away before new ones are ready costs capacity while it lasts", () => {
    const result = rollOut(
      { maxSurge: 1, maxUnavailable: 1 },
      "healthy",
      2_000,
    );

    expect(result.steps[0]!.nodes.app!.replicas).toBe(2);
    expect(kinds(result)).toContain("saturated");
    expect(phases(result)[6]).toBe("complete");
  });

  test("recreate takes every pod away at once, so the service is down until the new ones start", () => {
    const result = rollOut({ strategy: "recreate" });

    expect(availability(result).slice(0, 4)).toEqual([0, 0, 0, 1]);
    expect(phases(result)[3]).toBe("complete");
  });

  test("a release that never gets ready stalls behind a readiness probe and users notice nothing", () => {
    const result = rollOut(
      { maxSurge: 1, maxUnavailable: 0, readinessProbe: true },
      "never-ready",
    );

    expect(Math.min(...availability(result))).toBe(1);
    expect(phases(result)[11]).toBe("rolling");
    expect(phases(result)[12]).toBe("stalled");
    expect(result.steps[12]!.nodes.app!.rollout).toMatchObject({
      old: 3,
      ready: 0,
      starting: 1,
    });
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      kind: "rollout-stalled",
      atStep: 12,
      data: { ready: 0, replicas: 3, old: 3, deadlineSeconds: 120 },
    });
  });

  test("without a readiness probe the same release takes traffic it cannot serve and replaces every good pod", () => {
    const result = rollOut({ maxSurge: 1, maxUnavailable: 0 }, "never-ready");

    expect(availability(result)[3]).toBeCloseTo(2 / 3, 6);
    expect(phases(result)[9]).toBe("complete");
    expect(availability(result)[9]).toBe(0);
    expect(kinds(result)).toContain("errors");
    expect(kinds(result)).toContain("slo-breach");
  });

  test("blue-green switches only once the whole new set is ready, and then all at once", () => {
    const stuck = rollOut(
      { strategy: "blue-green", readinessProbe: true },
      "never-ready",
    );
    const broken = rollOut({ strategy: "blue-green" }, "broken");

    expect(Math.min(...availability(stuck))).toBe(1);
    expect(kinds(stuck)).toEqual(["rollout-stalled"]);
    expect(availability(broken).slice(0, 4)).toEqual([1, 1, 1, 0]);
  });

  test("a canary that fails what it serves is rolled back after one step", () => {
    const result = rollOut({ strategy: "canary" }, "broken");

    expect(availability(result)[3]).toBeCloseTo(0.75, 6);
    expect(phases(result)[4]).toBe("rolled-back");
    expect(availability(result)[4]).toBe(1);
    expect(result.steps[4]!.nodes.app!.replicas).toBe(3);
    expect(kinds(result)).toContain("rolled-back");
  });

  test("a healthy canary is analysed, then the rest rolls", () => {
    const result = rollOut({ strategy: "canary", canarySeconds: 30 });

    expect(result.steps[5]!.nodes.app!.rollout).toMatchObject({
      old: 3,
      ready: 1,
    });
    expect(phases(result)).toContain("complete");
    expect(Math.min(...availability(result))).toBe(1);
  });

  test("a pod autoscaler waits for the rollout to settle", () => {
    const run = (scaled: boolean) => {
      const design = cluster({ maxSurge: 1, maxUnavailable: 0 }, 2_700);

      if (scaled) {
        design.nodes.push(node("hpa", "hpa", { min: 3, max: 10 }));
        design.edges.push(edge("hpa", "app", "scales"));
      }

      return evaluateLoad(design, {
        kind: "load",
        durationSeconds: 200,
        faults: [{ kind: "rollout", nodeId: "app", at: 0, release: "healthy" }],
      }).steps.map((step) => step.nodes.app!);
    };
    const fixed = run(false);
    const scaled = run(true);
    const settled = scaled.findIndex(
      (step) => step.rollout!.phase === "complete",
    );

    expect(scaled.slice(0, settled).map((step) => step.replicas)).toEqual(
      fixed.slice(0, settled).map((step) => step.replicas),
    );
    expect(scaled[settled + 2]!.replicas).toBeGreaterThan(3);
  });

  test("a rollout on anything but a deployment changes nothing", () => {
    const design = graph(
      [node("users", "client"), node("api", "service")],
      [edge("users", "api")],
    );
    const result = evaluateLoad(design, {
      kind: "load",
      durationSeconds: 30,
      faults: [{ kind: "rollout", nodeId: "api", at: 0, release: "broken" }],
    });

    expect(result.steps[0]!.nodes.api!.rollout).toBeUndefined();
    expect(result.findings).toEqual([]);
  });
});
