import { describe, expect, test } from "bun:test";

import { edge, graph, node } from "../build";
import { NODE_KINDS } from "../catalogue";
import { PRICES } from "../pricing";
import { costOf, nodeCost } from "./cost";

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

describe("found in review", () => {
  test("a primary charges a standby only when no replica can take over", () => {
    const primary = node("db", "sql-database", "Orders", {
      failover: "automatic",
      storageGb: 0,
    });
    const alone = graph([primary], []);
    const replicated = graph(
      [primary, node("replica", "sql-database", "Replica", { storageGb: 0 })],
      [edge("db", "replica", "replication")],
    );

    expect(nodeCost(alone, primary).monthlyUsd).toBe(2 * PRICES.sqlInstance);
    expect(nodeCost(replicated, primary).monthlyUsd).toBe(PRICES.sqlInstance);
  });

  test("prices a SQL instance by the capacity it is sized for", () => {
    const base = node("db", "sql-database", "Orders", { storageGb: 0 });
    const large = node("db", "sql-database", "Orders", {
      storageGb: 0,
      readCapacityRps: 40_000,
      shards: 2,
    });

    expect(nodeCost(graph([base], []), base).monthlyUsd).toBe(
      PRICES.sqlInstance,
    );
    expect(nodeCost(graph([large], []), large).monthlyUsd).toBe(
      2 * 8 * PRICES.sqlInstance,
    );
    expect(nodeCost(graph([large], []), large).basis).toBe(
      "2 instances, each 8× the base size, and 0 GB",
    );
  });

  test("prices the replicas a service ran, and an autoscaler's pods within its bounds", () => {
    const api = node("api", "service", "API", { replicas: 2 });
    const pods = node("pods", "k8s-deployment", "Pods", { replicas: 50 });
    const scaler = node("hpa", "hpa", "Autoscaler", { min: 2, max: 10 });
    const design = graph([api, pods, scaler], [edge("hpa", "pods", "scales")]);

    expect(
      nodeCost(design, api, { reads: 0, writes: 0, replicas: 6.5 }).monthlyUsd,
    ).toBe(6.5 * PRICES.replica);
    expect(nodeCost(design, pods).monthlyUsd).toBe(10 * PRICES.pod);
  });
});

describe("prices", () => {
  test("cost a design with every kind without failing", () => {
    const estimate = costOf(
      graph(NODE_KINDS.map((kind) => node(kind, kind, kind))),
    );

    expect(Number.isFinite(estimate.monthlyUsd)).toBe(true);
    expect(estimate.nodes).toHaveLength(NODE_KINDS.length);
    expect(estimate.nodes.every((item) => item.monthlyUsd >= 0)).toBe(true);
  });

  test("charge DNS for its zone and a client nothing", () => {
    const design = graph(
      [node("users", "client", "Users"), node("dns", "dns", "DNS")],
      [edge("users", "dns", "sync-call")],
    );

    expect(costOf(design).monthlyUsd).toBe(PRICES.dns);
  });
});
