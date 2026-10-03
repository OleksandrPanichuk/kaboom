import { createGroup, createNode, emptyGraph } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { DEFAULT_SCENARIO } from "@/features/simulation/constants";

import { formatClock, formatMs, formatShare, heatOf } from "./heat";
import { overlayAt } from "./overlayAt";
import { toScenario } from "./toScenario";

const graph = {
  ...emptyGraph(),
  nodes: [
    createNode("service", { id: "api" }),
    createNode("cache", { id: "cache" }),
  ],
};

const step = (rho: number, up = true, load = 10) => ({
  reads: load,
  writes: 0,
  rho,
  p50: 1,
  p99: 1,
  ownErrorRate: 0,
  errorRate: 0,
  up,
});

describe("toScenario", () => {
  test("turns a spike into a traffic window and keeps the SLO", () => {
    const scenario = toScenario(
      {
        ...DEFAULT_SCENARIO,
        spike: { enabled: true, multiplier: 5, at: 60, until: 120 },
      },
      graph,
    );

    expect(scenario.traffic).toEqual([
      { at: 60, multiplier: 5 },
      { at: 120, multiplier: 1 },
    ]);
    expect(scenario.slo).toEqual({ p99Ms: 300, availability: 0.999 });
  });

  test("builds each fault with only its own fields, and drops faults on removed nodes", () => {
    const scenario = toScenario(
      {
        ...DEFAULT_SCENARIO,
        faults: [
          {
            key: "1",
            kind: "capacity",
            targetId: "api",
            at: 30,
            until: null,
            factor: 0.5,
            addMs: 100,
            release: "healthy",
          },
          {
            key: "2",
            kind: "cache-flush",
            targetId: "cache",
            at: 60,
            until: 90,
            factor: 1,
            addMs: 0,
            release: "healthy",
          },
          {
            key: "3",
            kind: "node-down",
            targetId: "gone",
            at: 0,
            until: null,
            factor: 1,
            addMs: 0,
            release: "healthy",
          },
        ],
      },
      graph,
    );

    expect(scenario.faults).toEqual([
      { kind: "capacity", nodeId: "api", at: 30, factor: 0.5 },
      { kind: "cache-flush", nodeId: "cache", at: 60 },
    ]);
  });

  test("builds a rollout with the version it ships and no end", () => {
    const withDeployment = {
      ...graph,
      nodes: [...graph.nodes, createNode("k8s-deployment", { id: "app" })],
    };
    const scenario = toScenario(
      {
        ...DEFAULT_SCENARIO,
        faults: [
          {
            key: "1",
            kind: "rollout",
            targetId: "app",
            at: 30,
            until: 90,
            factor: 1,
            addMs: 0,
            release: "never-ready",
          },
        ],
      },
      withDeployment,
    );

    expect(scenario.faults).toEqual([
      { kind: "rollout", nodeId: "app", at: 30, release: "never-ready" },
    ]);
  });

  test("builds a region fault on its group, and drops it once the region is gone", () => {
    const withRegion = {
      ...graph,
      groups: [createGroup({ id: "eu", kind: "region", label: "EU" })],
    };
    const fault = (targetId: string) => ({
      key: targetId,
      kind: "region-down" as const,
      targetId,
      at: 60,
      until: 120,
      factor: 1,
      addMs: 0,
      release: "healthy" as const,
    });
    const scenario = toScenario(
      { ...DEFAULT_SCENARIO, faults: [fault("eu"), fault("gone")] },
      withRegion,
    );

    expect(scenario.faults).toEqual([
      { kind: "region-down", groupId: "eu", at: 60, until: 120 },
    ]);
  });
});

describe("heat", () => {
  test("grades a node by how busy it is", () => {
    expect(heatOf(undefined)).toBe("idle");
    expect(heatOf(step(0.3, true, 0))).toBe("idle");
    expect(heatOf(step(0.3))).toBe("ok");
    expect(heatOf(step(0.8))).toBe("busy");
    expect(heatOf(step(1.4))).toBe("saturated");
    expect(heatOf(step(0, false))).toBe("down");
    expect(heatOf({ ...step(0.2, true, 1_000), throttled: 500 })).toBe("busy");
  });

  test("formats numbers for a card", () => {
    expect(formatShare(0.823)).toBe("82%");
    expect(formatShare(Number.POSITIVE_INFINITY)).toBe("∞");
    expect(formatMs(42.4)).toBe("42 ms");
    expect(formatMs(1_250)).toBe("1.3 s");
    expect(formatClock(130)).toBe("2:10");
  });
});

describe("overlayAt", () => {
  test("labels each node with its load and weighs edges against the busiest", () => {
    const g = {
      ...emptyGraph(),
      nodes: [
        createNode("client", { id: "users" }),
        createNode("service", { id: "api" }),
      ],
      edges: [
        {
          id: "e1",
          from: "users",
          to: "api",
          kind: "sync-call" as const,
          label: "",
          props: { share: 1, fanOut: 1, timeoutMs: 1_000 },
        },
      ],
    };
    const overlay = overlayAt(g, {
      t: 0,
      nodes: {
        users: step(0, true, 1_200),
        api: { ...step(0.82, true, 1_200) },
      },
      edges: { e1: { reads: 1_200, writes: 0 } },
      clients: {},
    });

    expect(overlay?.nodes.users?.text).toBe("Sends 1.2K/s");
    expect(overlay?.nodes.api).toEqual({ tone: "busy", text: "82% · 1.2K/s" });
    expect(overlay?.edges.e1).toBe(1);
  });
});
