import { describe, expect, test } from "bun:test";

import type { LoadScenarioInput } from "../evaluate/scenario";
import { OFFICIAL_PROBLEMS } from "../problems/library";
import { edge, graph, node } from "../problems/library/build";
import { runTests } from "./run-tests";
import { statusOf, VARIATION, vary } from "./variation";

const design = graph(
  [
    node("users", "client", "Users", { rps: 1_000, readRatio: 0.9 }),
    node("gate", "rate-limiter", "Gate"),
    node("api", "service", "API", { replicas: 4, capacityRpsPerReplica: 500 }),
  ],
  [edge("users", "gate", "sync-call"), edge("gate", "api", "sync-call")],
);

const scenario: LoadScenarioInput = {
  kind: "load",
  durationSeconds: 300,
  traffic: [{ at: 60, multiplier: 2 }],
  faults: [{ kind: "node-down", nodeId: "api", at: 100, until: 160 }],
};

const shortener = OFFICIAL_PROBLEMS.find(
  (problem) => problem.slug === "url-shortener",
)!;

const sized = (replicas: number) =>
  graph(
    [
      node("users", "client", "Users", { rps: 10_000, readRatio: 0.95 }),
      node("api", "service", "API", {
        replicas,
        capacityRpsPerReplica: 2_500,
      }),
      node("cache", "cache", "Cache", {
        hitRatio: 0.9,
        readCapacityRps: 100_000,
      }),
      node("db", "sql-database", "Links", {
        readCapacityRps: 20_000,
        writeCapacityRps: 4_000,
      }),
    ],
    [
      edge("users", "api", "sync-call"),
      edge("api", "cache", "read"),
      edge("cache", "db", "read"),
      edge("api", "db", "write"),
    ],
  );

describe("vary", () => {
  test("changes nothing for seed 0, and the same way every time for any other", () => {
    expect(vary(design, scenario, 0)).toEqual({ graph: design, scenario });
    expect(vary(design, scenario, 7)).toEqual(vary(design, scenario, 7));
    expect(vary(design, scenario, 7)).not.toEqual(vary(design, scenario, 8));
  });

  test("stays within its bounds and leaves clients and limits alone", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { graph: varied, scenario: run } = vary(design, scenario, seed);
      const api = varied.nodes.find((item) => item.id === "api")!;
      const fault = run.faults![0]!;

      expect(varied.nodes[0]).toEqual(design.nodes[0]);
      expect((varied.nodes[1]!.props as { limitRps: number }).limitRps).toBe(
        10_000,
      );
      expect(
        (api.props as { capacityRpsPerReplica: number }).capacityRpsPerReplica,
      ).toBeWithin(
        500 * (1 - VARIATION.capacityNoise),
        500 * (1 + VARIATION.capacityNoise) + 1e-9,
      );
      expect(fault.at).toBeWithin(70, 131);
      expect("until" in fault && fault.until! > fault.at).toBe(true);
      expect(run.traffic!.length).toBeLessThanOrEqual(100);

      for (const point of run.traffic!) {
        const base = point.at >= 60 ? 2 : 1;

        expect(point.multiplier).toBeWithin(
          base * (1 - VARIATION.trafficNoise),
          base * (1 + VARIATION.trafficNoise) * VARIATION.burstMultiplier[1] +
            1e-9,
        );
      }
    }
  });

  test("can leave the faults as drawn", () => {
    expect(
      vary(design, scenario, 3, { faults: false }).scenario.faults,
    ).toEqual(scenario.faults);
  });
});

describe("varied runs", () => {
  test("call a test flaky when it passes as drawn and not when varied", () => {
    expect(statusOf(false, null)).toBe("failed");
    expect(
      statusOf(true, { passed: 19, total: 20, worstSeed: 4, worst: null }),
    ).toBe("passed");
    expect(
      statusOf(true, { passed: 18, total: 20, worstSeed: 4, worst: null }),
    ).toBe("flaky");
  });

  test("find a design sized to the letter of the spec, and spare one with room", () => {
    const day = (replicas: number) =>
      runTests(shortener, sized(replicas), {
        include: "public",
        seeds: 20,
      }).tests.find((item) => item.id === "drill:normal-day")!;
    const tight = day(5);
    const roomy = day(7);
    const holds = tight.assertions.at(-1)!;

    expect(tight.status).toBe("flaky");
    expect(tight.variation?.worstSeed).not.toBeNull();
    expect(holds.label).toBe("Holds when traffic and capacity vary");
    expect(holds.passed).toBe(false);
    expect(roomy.status).toBe("passed");
    expect(roomy.variation).toEqual({ passed: 20, total: 20, worstSeed: null });
  });

  test("hold for every reference, on every seed", () => {
    const flaky = OFFICIAL_PROBLEMS.flatMap((problem) =>
      runTests(problem, problem.reference.graph, { include: "all", seeds: 20 })
        .tests.filter((item) => item.status === "flaky")
        .map((item) => `${problem.slug}: ${item.title}`),
    );

    expect(flaky).toEqual([]);
  }, 30_000);
});
