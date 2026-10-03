import { describe, expect, test } from "bun:test";

import { evaluateLoad } from "./evaluate-load";
import { edge, graph, node } from "./fixtures";

const once = (design: ReturnType<typeof graph>, extra = {}) =>
  evaluateLoad(design, { kind: "load", durationSeconds: 10, ...extra });

describe("load evaluator rules", () => {
  test("a pod autoscaler grows a deployment from its floor, and pods carry the load", () => {
    const design = graph(
      [
        node("users", "client", { rps: 3_000 }),
        node("edge", "ingress"),
        node("web", "k8s-service"),
        node("app", "k8s-deployment", {
          replicas: 1,
          capacityRpsPerReplica: 1_000,
        }),
        node("hpa", "hpa", { min: 2, max: 10, targetUtilisation: 0.7 }),
        node("keys", "secret"),
      ],
      [
        edge("users", "edge"),
        edge("edge", "web"),
        edge("web", "app"),
        edge("hpa", "app", "scales"),
        edge("app", "keys", "mounts"),
      ],
    );
    const { steps } = evaluateLoad(design, {
      kind: "load",
      durationSeconds: 40,
    });

    expect(steps[0]!.nodes.app!.replicas).toBe(2);
    expect(steps[0]!.nodes.app!.rho).toBeGreaterThan(1);
    expect(steps[2]!.nodes.app!.replicas).toBe(3);
    expect(steps[0]!.nodes.keys!.reads + steps[0]!.nodes.keys!.writes).toBe(0);
    expect(steps[0]!.edges["hpa-app-scales"]).toBeUndefined();
  });

  test("a stream gives every consumer group the whole stream", () => {
    const design = graph(
      [
        node("orders", "client", { rps: 600 }),
        node("log", "stream"),
        node("billing", "worker", {
          replicas: 2,
          capacityMsgPerReplica: 1_000,
        }),
        node("search", "worker", { replicas: 2, capacityMsgPerReplica: 1_000 }),
      ],
      [
        edge("orders", "log", "async-message"),
        edge("log", "billing", "async-message"),
        edge("log", "search", "async-message"),
      ],
    );
    const step = once(design).steps[0]!;

    for (const id of ["billing", "search"]) {
      expect(step.nodes[id]!.reads + step.nodes[id]!.writes).toBeCloseTo(
        600,
        6,
      );
    }
  });

  test("a queue splits its messages between competing consumers by capacity", () => {
    const design = graph(
      [
        node("orders", "client", { rps: 600 }),
        node("q", "queue"),
        node("small", "worker", { replicas: 1, capacityMsgPerReplica: 1_000 }),
        node("large", "worker", { replicas: 2, capacityMsgPerReplica: 1_000 }),
      ],
      [
        edge("orders", "q", "async-message"),
        edge("q", "small", "async-message"),
        edge("q", "large", "async-message"),
      ],
    );
    const step = once(design).steps[0]!;
    const got = (id: string) => step.nodes[id]!.reads + step.nodes[id]!.writes;

    expect(got("small")).toBeCloseTo(200, 6);
    expect(got("large")).toBeCloseTo(400, 6);
    expect(step.nodes.q!.backlog).toBe(0);
  });

  test("errors travel back along synchronous edges and stop at async ones", () => {
    const design = graph(
      [
        node("users", "client", { rps: 100 }),
        node("api", "service", { replicas: 2 }),
        node("db", "sql-database"),
        node("mailer", "worker", { replicas: 2 }),
      ],
      [
        edge("users", "api"),
        edge("api", "db", "write"),
        edge("api", "db", "read"),
        edge("api", "mailer", "async-message"),
      ],
    );
    const downDb = once(design, {
      faults: [{ kind: "node-down", nodeId: "db", at: 0 }],
    });
    const downMailer = once(design, {
      faults: [{ kind: "node-down", nodeId: "mailer", at: 0 }],
    });

    expect(downDb.steps[0]!.clients.users!.availability).toBe(0);
    expect(downMailer.steps[0]!.clients.users!.availability).toBe(1);
  });

  test("a service that calls two others for every request fails when either does", () => {
    const design = graph(
      [
        node("users", "client", { rps: 100 }),
        node("api", "service", { replicas: 2 }),
        node("profile", "service", { replicas: 2 }),
        node("orders", "service", { replicas: 2 }),
      ],
      [edge("users", "api"), edge("api", "profile"), edge("api", "orders")],
    );
    const step = once(design, {
      faults: [{ kind: "capacity", nodeId: "orders", at: 0, factor: 0.001 }],
    }).steps[0]!;
    const ordersErrors = step.nodes.orders!.errorRate;

    expect(ordersErrors).toBeGreaterThan(0.9);
    expect(step.clients.users!.availability).toBeCloseTo(1 - ordersErrors, 6);
  });

  test("latency grows as base / (1 − ρ), and pins at the caller's timeout when saturated", () => {
    const at = (rps: number) =>
      once(
        graph(
          [
            node("users", "client", { rps }),
            node("api", "service", {
              replicas: 1,
              capacityRpsPerReplica: 100,
              baseLatencyMs: 20,
            }),
          ],
          [edge("users", "api", "sync-call", { timeoutMs: 800 })],
        ),
      ).steps[0]!;

    expect(at(50).nodes.api!.p50).toBeCloseTo(40, 6);
    expect(at(50).nodes.api!.p99).toBeCloseTo(60, 6);
    expect(at(50).clients.users!.p99).toBeCloseTo(60, 6);
    expect(at(200).nodes.api!.p50).toBe(800);
    expect(at(200).nodes.api!.p99).toBe(800);
  });

  test("a primary spreads its reads over itself and its replicas, and writes over itself alone", () => {
    const withReplicas = (replicas: number) =>
      once(
        graph(
          [
            node("users", "client", { rps: 10_000, readRatio: 0.9 }),
            node("api", "service", {
              replicas: 20,
              capacityRpsPerReplica: 1_000,
            }),
            node("db", "sql-database", {
              readCapacityRps: 3_000,
              writeCapacityRps: 2_000,
            }),
            ...Array.from({ length: replicas }, (_, index) =>
              node(`r${index}`, "sql-database"),
            ),
          ],
          [
            edge("users", "api"),
            edge("api", "db", "read"),
            edge("api", "db", "write"),
            ...Array.from({ length: replicas }, (_, index) =>
              edge("db", `r${index}`, "replication"),
            ),
          ],
        ),
      ).steps[0]!;

    expect(withReplicas(0).nodes.db!.rho).toBeCloseTo(3, 6);
    expect(withReplicas(2).nodes.db!.rho).toBeCloseTo(1, 6);
    expect(withReplicas(4).nodes.db!.rho).toBeCloseTo(0.6, 6);
    expect(withReplicas(4).nodes.r0!.rho).toBeCloseTo(0.6, 6);
  });

  test("a balancer skips a target that is down, unless it has no health checks", () => {
    const design = (healthCheck: boolean) =>
      graph(
        [
          node("users", "client", { rps: 900 }),
          node("lb", "load-balancer", { healthCheck }),
          node("a", "service", { replicas: 2 }),
          node("b", "service", { replicas: 2 }),
          node("c", "service", { replicas: 2 }),
        ],
        [
          edge("users", "lb"),
          edge("lb", "a"),
          edge("lb", "b"),
          edge("lb", "c"),
        ],
      );
    const fault = {
      faults: [{ kind: "node-down", nodeId: "c", at: 0 }] as const,
    };
    const checked = once(design(true), fault).steps[0]!;
    const blind = once(design(false), fault).steps[0]!;

    expect(checked.nodes.a!.reads + checked.nodes.a!.writes).toBeCloseTo(
      450,
      6,
    );
    expect(checked.clients.users!.availability).toBe(1);
    expect(blind.nodes.a!.reads + blind.nodes.a!.writes).toBeCloseTo(300, 6);
    expect(blind.clients.users!.availability).toBeCloseTo(2 / 3, 6);
  });

  test("capacity and latency faults hold only inside their window", () => {
    const design = graph(
      [
        node("users", "client", { rps: 100 }),
        node("api", "service", {
          replicas: 1,
          capacityRpsPerReplica: 400,
          baseLatencyMs: 10,
        }),
      ],
      [edge("users", "api")],
    );
    const { steps } = evaluateLoad(design, {
      kind: "load",
      durationSeconds: 40,
      faults: [
        { kind: "capacity", nodeId: "api", at: 10, until: 20, factor: 0.5 },
        { kind: "latency", nodeId: "api", at: 20, until: 30, addMs: 90 },
      ],
    });

    expect(steps.map((step) => step.nodes.api!.rho)).toEqual([
      0.25, 0.5, 0.25, 0.25,
    ]);
    expect(steps[2]!.nodes.api!.p50).toBeCloseTo(100 / 0.75, 6);
    expect(steps[3]!.nodes.api!.p50).toBeCloseTo(10 / 0.75, 6);
  });

  test("reports an SLO breach with the numbers behind it", () => {
    const design = graph(
      [
        node("users", "client", { rps: 100 }),
        node("api", "service", {
          replicas: 1,
          capacityRpsPerReplica: 110,
          baseLatencyMs: 50,
        }),
      ],
      [edge("users", "api")],
    );
    const breach = once(design).findings.find(
      (finding) => finding.kind === "slo-breach",
    );

    expect(breach?.target).toEqual({ type: "node", id: "users" });
    expect(breach?.data.targetP99).toBe(300);
    expect(breach?.data.p99).toBeGreaterThan(300);
    expect(breach?.message).toContain("300 ms target");
  });

  test("gives the same numbers for the same graph and scenario", () => {
    const design = graph(
      [
        node("users", "client", { rps: 5_000 }),
        node("lb", "load-balancer"),
        node("api", "service", { replicas: 3 }),
        node("q", "queue"),
        node("worker", "worker", { replicas: 1 }),
      ],
      [
        edge("users", "lb"),
        edge("lb", "api"),
        edge("api", "q", "async-message"),
        edge("q", "worker", "async-message"),
      ],
    );
    const scenario = {
      kind: "load" as const,
      traffic: [{ at: 120, multiplier: 3 }],
      faults: [
        { kind: "node-down" as const, nodeId: "worker", at: 200, until: 260 },
      ],
    };

    expect(JSON.stringify(evaluateLoad(design, scenario))).toBe(
      JSON.stringify(evaluateLoad(design, scenario)),
    );
  });

  test("fails every request of a client that connects to nothing", () => {
    const lonely = once(graph([node("users", "client", { rps: 100 })], []));

    expect(lonely.steps[0]!.clients.users!.availability).toBe(0);
    expect(lonely.findings.map((finding) => finding.kind)).toContain(
      "slo-breach",
    );
  });

  test("defaults to 60 steps of 10 s and refuses a malformed scenario", () => {
    const design = graph([node("users", "client")], []);

    expect(evaluateLoad(design, { kind: "load" }).steps).toHaveLength(60);
    expect(() =>
      evaluateLoad(design, { kind: "load", stepSeconds: 0 } as never),
    ).toThrow();
  });
});
