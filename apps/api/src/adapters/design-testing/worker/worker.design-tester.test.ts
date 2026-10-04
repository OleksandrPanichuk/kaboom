import { OFFICIAL_PROBLEMS } from "@repo/design/library";
import { afterEach, describe, expect, test } from "bun:test";

import {
  DesignTestsTimedOutError,
  DesignTestsUnavailableError,
} from "@/platform/design-testing/design-testing.errors";
import { testDesign } from "@/platform/design-testing/design-testing.helpers";
import type { DesignTestRequest } from "@/platform/design-testing/ports";

import { WorkerDesignTester } from "./worker.design-tester";

const SCRIPT = new URL("./tester.worker", import.meta.url);

const chat = OFFICIAL_PROBLEMS.find((problem) => problem.slug === "chat")!;

const request = (copies = 1): DesignTestRequest => {
  const { graph } = chat.reference;
  const suffix = (id: string, copy: number) =>
    copy === 0 ? id : `${id}-${copy}`;

  return {
    problem: chat,
    graph: {
      ...graph,
      nodes: Array.from({ length: copies }, (_, copy) =>
        graph.nodes.map((node) => ({ ...node, id: suffix(node.id, copy) })),
      ).flat(),
      edges: Array.from({ length: copies }, (_, copy) =>
        graph.edges.map((edge) => ({
          ...edge,
          id: suffix(edge.id, copy),
          from: suffix(edge.from, copy),
          to: suffix(edge.to, copy),
        })),
      ).flat(),
    },
    include: "all",
    seeds: 20,
  };
};

const withoutTimings = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (key, item: unknown) =>
      key === "durationMs" ? 0 : item,
    ),
  );

let pools: WorkerDesignTester[] = [];

const pool = (size: number, timeoutMs = 30_000) => {
  const tester = new WorkerDesignTester({ size, timeoutMs, script: SCRIPT });

  tester.start();
  pools.push(tester);

  return tester;
};

afterEach(async () => {
  await Promise.all(pools.map((tester) => tester.close()));
  pools = [];
});

describe("WorkerDesignTester", () => {
  test("answers what the tests answer in-process", async () => {
    const result = await pool(1).test(request());

    expect(withoutTimings(result)).toEqual(
      withoutTimings(testDesign(request())),
    );
  }, 30_000);

  test("leaves the event loop free while a large design is scored", async () => {
    const tester = pool(1);
    const ticks: number[] = [];
    const timer = setInterval(() => ticks.push(performance.now()), 10);
    const started = performance.now();

    await tester.test(request(30));
    clearInterval(timer);

    const longest = ticks.reduce(
      (gap, tick, index) =>
        Math.max(gap, tick - (index === 0 ? started : ticks[index - 1]!)),
      0,
    );

    expect(ticks.length).toBeGreaterThan(5);
    expect(longest).toBeLessThan(250);
  }, 60_000);

  test("queues past its size and answers every test", async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () => pool(2).test(request())),
    );

    expect(results.every((result) => result.score.score === 100)).toBe(true);
  }, 60_000);

  test("gives up on a test past its timeout, and keeps working", async () => {
    const tester = pool(1, 1_000);

    const slow = tester.test(request(60));
    const next = tester.test({ ...request(), seeds: 0 });

    expect(slow).rejects.toBeInstanceOf(DesignTestsTimedOutError);
    expect((await next).score.score).toBe(100);
  }, 60_000);

  test("refuses tests once closed", async () => {
    const tester = pool(1);

    await tester.close();

    expect(tester.test(request())).rejects.toBeInstanceOf(
      DesignTestsUnavailableError,
    );
  });
});
