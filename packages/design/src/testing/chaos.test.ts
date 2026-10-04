import { describe, expect, test } from "bun:test";

import { createGroup, type DesignGraph } from "../graph";
import { edge, graph, node } from "../problems/library/build";
import { type LoadDrill, LoadDrillSchema } from "../problems/schema";
import { ChaosSettingsSchema } from "../problems/schema";
import { chaosCases, runChaosCase } from "./chaos";

const settings = ChaosSettingsSchema.parse({});

const baseline: LoadDrill = LoadDrillSchema.parse({
  id: "normal-day",
  title: "A normal day",
  visibility: "public",
  durationSeconds: 300,
  slo: { p99Ms: 300, availability: 0.999 },
  expect: { minAvailability: 0.999 },
});

const shop = (replicas: number, retries = 0): DesignGraph => ({
  ...graph(
    [
      node("users", "client", "Users", { rps: 1_000, readRatio: 0.9 }),
      { ...node("lb", "load-balancer", "LB"), groupId: "eu" },
      {
        ...node("api", "service", "Shop API", {
          replicas,
          capacityRpsPerReplica: 1_000,
        }),
        groupId: "eu",
      },
      {
        ...node("db", "sql-database", "Orders", { failover: "automatic" }),
        groupId: "eu",
      },
      { ...node("replica", "sql-database", "Orders replica"), groupId: "eu" },
    ],
    [
      edge("users", "lb", "sync-call"),
      edge("lb", "api", "sync-call", { retries }),
      edge("api", "db", "read", { retries }),
      edge("api", "db", "write", { retries }),
      edge("db", "replica", "replication"),
    ],
  ),
  groups: [createGroup({ id: "eu", kind: "region", label: "Europe" })],
});

const outcome = (design: DesignGraph, id: string) => {
  const found = chaosCases(design, settings).find((item) => item.id === id)!;

  return runChaosCase(design, found, baseline, settings);
};

describe("chaos cases", () => {
  test("take out one replica of a replicated service, and the whole of a single one", () => {
    const [many] = chaosCases(shop(4), settings).filter(
      (item) => item.id === "chaos:instance:api",
    );
    const [one] = chaosCases(shop(1), settings).filter(
      (item) => item.id === "chaos:instance:api",
    );

    expect(many?.title).toBe("Shop API loses one of its 4 replicas");
    expect(many?.faults).toEqual([
      { kind: "capacity", nodeId: "api", factor: 0.75, at: 60, until: 180 },
    ]);
    expect(one?.title).toBe("Shop API's only replica fails");
    expect(one?.faults[0]?.kind).toBe("node-down");
  });

  test("fail a primary, lose every region that holds something, and leave managed entry points alone", () => {
    const ids = chaosCases(shop(4), settings).map((item) => item.id);

    expect(ids).toContain("chaos:instance:db");
    expect(ids).toContain("chaos:group-down:eu");
    expect(ids).not.toContain("chaos:instance:lb");
    expect(ids).not.toContain("chaos:flaky:lb");
    expect(ids).toContain("chaos:flaky:db");
  });

  test("stop at the problem's limit", () => {
    expect(
      chaosCases(shop(4), { ...settings, maxCases: 2 }).map((item) => item.id),
    ).toEqual(["chaos:group-down:eu", "chaos:instance:api"]);
  });
});

describe("running a chaos case", () => {
  test("a service with room to lose a replica survives it, and one without does not", () => {
    expect(outcome(shop(4), "chaos:instance:api").passed).toBe(true);
    expect(outcome(shop(1), "chaos:instance:api").passed).toBe(false);
  });

  test("a flaky store needs a retry to stay within the target", () => {
    expect(outcome(shop(4), "chaos:flaky:db").passed).toBe(false);
    expect(outcome(shop(4, 1), "chaos:flaky:db").passed).toBe(true);
  });

  test("names the worst moment and who failed", () => {
    const failed = outcome(shop(1), "chaos:instance:api").assertions.find(
      (item) => !item.passed,
    )!;

    expect(failed.at).toBeGreaterThanOrEqual(settings.faultAt);
    expect(failed.nodeIds).toEqual(["users", "api"]);
    expect(failed.message).toContain("Shop API's only replica fails");
  });
});
