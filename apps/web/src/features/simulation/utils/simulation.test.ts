import { createNode, emptyGraph } from "@repo/design";
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
            nodeId: "api",
            at: 30,
            until: null,
            factor: 0.5,
            addMs: 100,
          },
          {
            key: "2",
            kind: "cache-flush",
            nodeId: "cache",
            at: 60,
            until: 90,
            factor: 1,
            addMs: 0,
          },
          {
            key: "3",
            kind: "node-down",
            nodeId: "gone",
            at: 0,
            until: null,
            factor: 1,
            addMs: 0,
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
});

describe("heat", () => {
  test("grades a node by how busy it is", () => {
    expect(heatOf(undefined)).toBe("idle");
    expect(heatOf(step(0.3, true, 0))).toBe("idle");
    expect(heatOf(step(0.3))).toBe("ok");
    expect(heatOf(step(0.8))).toBe("busy");
    expect(heatOf(step(1.4))).toBe("saturated");
    expect(heatOf(step(0, false))).toBe("down");
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
