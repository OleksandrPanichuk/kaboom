import { describe, expect, test } from "bun:test";

import type { Release } from "../scenario";
import { evaluateLoad } from "./evaluate-load";
import { edge, graph, node } from "./fixtures";

const app = (deployment: Record<string, unknown>, overlapSeconds = 0) =>
  graph(
    [
      node("users", "client", { rps: 1_000 }),
      node("web", "k8s-service"),
      node("app", "k8s-deployment", {
        replicas: 3,
        capacityRpsPerReplica: 1_000,
        startupSeconds: 30,
        maxSurge: 1,
        maxUnavailable: 0,
        progressDeadlineSeconds: 900,
        ...deployment,
      }),
      node("password", "secret", { overlapSeconds }),
    ],
    [
      edge("users", "web"),
      edge("web", "app"),
      edge("app", "password", "mounts"),
    ],
  );

const availability = (result: ReturnType<typeof evaluateLoad>) =>
  result.steps.map((step) => step.clients.users!.availability);

const kinds = (result: ReturnType<typeof evaluateLoad>) =>
  result.findings.map((finding) => finding.kind);

describe("rotating a secret", () => {
  const rotate = (deployment: Record<string, unknown>, overlapSeconds = 0) =>
    evaluateLoad(app(deployment, overlapSeconds), {
      kind: "load",
      durationSeconds: 400,
      faults: [{ kind: "secret-rotation", nodeId: "password", at: 60 }],
    });

  test("fails every request for good when pods read it from the environment and nothing restarts them", () => {
    const result = rotate({ secretDelivery: "env" });

    expect(availability(result).slice(5, 7)).toEqual([1, 0]);
    expect(availability(result).at(-1)).toBe(0);
    expect(kinds(result)).toContain("stale-secret");
  });

  test("fails until a mounted volume is refreshed, unless the old value outlives the refresh", () => {
    const abrupt = availability(rotate({ secretDelivery: "volume" }));
    const overlapped = availability(rotate({ secretDelivery: "volume" }, 120));

    expect(abrupt.slice(6, 13)).toEqual([0, 0, 0, 0, 0, 0, 1]);
    expect(Math.min(...overlapped)).toBe(1);
  });

  test("rolls the pods when they restart on a change, and fails nothing when the old value lasts the rollout", () => {
    const tight = rotate({
      secretDelivery: "env",
      restartOnSecretChange: true,
    });
    const overlapped = rotate(
      { secretDelivery: "env", restartOnSecretChange: true },
      300,
    );

    expect(tight.steps[7]!.nodes.app!.rollout).toMatchObject({
      phase: "rolling",
    });
    expect(Math.min(...availability(tight))).toBeLessThan(1);
    expect(availability(tight).at(-1)).toBe(1);
    expect(Math.min(...availability(overlapped))).toBe(1);
    expect(kinds(overlapped)).not.toContain("stale-secret");
  });
});

describe("a release with a schema migration", () => {
  const ship = (
    deployment: Record<string, unknown>,
    release: Release = "healthy",
  ) =>
    evaluateLoad(app(deployment), {
      kind: "load",
      durationSeconds: 400,
      faults: [
        { kind: "rollout", nodeId: "app", at: 60, release, migrates: true },
      ],
    });

  test("fails the old version from the moment a breaking migration runs", () => {
    const rolling = ship({ strategy: "rolling" });
    const blueGreen = ship({ strategy: "blue-green" });

    expect(availability(rolling)[6]).toBe(0);
    expect(availability(rolling).at(-1)).toBe(1);
    expect(availability(blueGreen).slice(6, 10)).toEqual([0, 0, 0, 1]);
    expect(kinds(blueGreen)).toContain("schema-break");
  });

  test("fails nothing when the migration keeps working with the previous version", () => {
    const result = ship({
      strategy: "blue-green",
      schemaChanges: "backward-compatible",
    });

    expect(Math.min(...availability(result))).toBe(1);
    expect(kinds(result)).not.toContain("schema-break");
  });

  test("cannot be rolled back after a breaking migration", () => {
    const canary = { strategy: "canary", canarySeconds: 60 };
    const breaking = ship(canary, "broken");
    const compatible = ship(
      { ...canary, schemaChanges: "backward-compatible" },
      "broken",
    );

    expect(kinds(breaking)).toContain("rolled-back");
    expect(availability(breaking).at(-1)).toBe(0);
    expect(kinds(compatible)).toContain("rolled-back");
    expect(availability(compatible).at(-1)).toBe(1);
  });
});
