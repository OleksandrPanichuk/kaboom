import { describe, expect, test } from "bun:test";

import { OFFICIAL_PROBLEMS } from "../problems/library";
import { edge, graph, node } from "../problems/library/build";
import { scoreSubmission } from "../problems/score";
import { costOf, nodeCost } from "./cost";
import { PRICES } from "./prices";

describe("costOf", () => {
  test("prices compute by the replica and a store by its instances", () => {
    const design = graph(
      [
        node("api", "service", "API", { replicas: 4 }),
        node("db", "sql-database", "Orders", {
          failover: "automatic",
          shards: 2,
          storageGb: 0,
        }),
      ],
      [],
    );
    const estimate = costOf(design);

    expect(
      estimate.nodes.find((item) => item.nodeId === "api")?.monthlyUsd,
    ).toBe(4 * PRICES.replica);
    expect(
      estimate.nodes.find((item) => item.nodeId === "db")?.monthlyUsd,
    ).toBe(4 * PRICES.sqlInstance);
    expect(estimate.monthlyUsd).toBe(
      4 * PRICES.replica + 4 * PRICES.sqlInstance,
    );
  });

  test("prices a per-request service by the traffic it carries", () => {
    const cdn = node("cdn", "cdn", "CDN");
    const design = graph([cdn], []);

    expect(nodeCost(design, cdn).monthlyUsd).toBe(0);
    expect(
      nodeCost(design, cdn, { reads: 1_000, writes: 0 }).monthlyUsd,
    ).toBeCloseTo(1_000 * 2.628 * PRICES.cdnPerMillion);
  });

  test("takes a product's own list price, Multi-AZ doubled", () => {
    const rds = {
      ...node("db", "sql-database", "Orders"),
      technology: {
        id: "amazon-rds",
        props: { instanceClass: "db.r6g.large", multiAz: true },
      },
    };
    const single = {
      ...rds,
      technology: {
        ...rds.technology,
        props: { ...rds.technology.props, multiAz: false },
      },
    };
    const design = graph([rds], []);

    expect(nodeCost(design, rds).monthlyUsd).toBeCloseTo(0.225 * 730 * 2);
    expect(nodeCost(design, single).monthlyUsd).toBeCloseTo(0.225 * 730);
    expect(nodeCost(design, rds).basis).toBe(
      "Amazon RDS for PostgreSQL list price",
    );
  });
});

describe("a budget on a problem", () => {
  const shortener = OFFICIAL_PROBLEMS.find(
    (problem) => problem.slug === "url-shortener",
  )!;
  const budget = (design: ReturnType<typeof graph>) =>
    scoreSubmission(shortener, design).items.find(
      (item) => item.key === "fits-the-budget",
    )!;

  test("is met by the reference", () => {
    expect(budget(shortener.reference.graph).passed).toBe(true);
  });

  test("names what costs the most when it is blown", () => {
    const lavish = {
      ...shortener.reference.graph,
      nodes: shortener.reference.graph.nodes.map((item) =>
        item.id === "api"
          ? { ...item, props: { ...item.props, replicas: 100 } }
          : item,
      ),
    } as typeof shortener.reference.graph;
    const item = budget(lavish);

    expect(item.passed).toBe(false);
    expect(item.evidence).toContain("over the $4,000 budget");
    expect(item.evidence).toContain("Shortener API $5,600");
  });

  test("waits for a design that works", () => {
    const empty = graph(
      [node("users", "client", "Users", { rps: 10_000 })],
      [],
    );

    expect(budget(empty)).toMatchObject({ passed: false });
    expect(budget(empty).evidence).toContain("once “A normal day” passes");
  });
});

describe("prices", () => {
  test("cost a design with every kind without failing", () => {
    for (const problem of OFFICIAL_PROBLEMS) {
      const estimate = costOf(problem.reference.graph);

      expect(Number.isFinite(estimate.monthlyUsd)).toBe(true);
      expect(estimate.nodes.every((item) => item.monthlyUsd >= 0)).toBe(true);
    }
  });

  test("charge DNS for its zone and a client nothing", () => {
    const design = graph(
      [node("users", "client", "Users"), node("dns", "dns", "DNS")],
      [edge("users", "dns", "sync-call")],
    );

    expect(costOf(design).monthlyUsd).toBe(PRICES.dns);
  });
});
