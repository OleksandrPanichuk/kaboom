import {
  database,
  graph,
  id,
  node,
  references,
  table,
  within,
} from "@repo/design/build";
import { describe, expect, test } from "bun:test";

import {
  bundleConflicts,
  bundleOf,
  flattenBundle,
  schemaReferences,
  splitSchemas,
} from "./bundle";

const orders = graph(
  [
    within("shop", table("customers", [id()])),
    within("shop", table("orders", [id()])),
  ],
  [references("orders", "id", "customers")],
  [database("shop", "Shop", "postgres")],
);

const named = (nodeId: string, designId: string) => ({
  ...node(nodeId, "sql-database", nodeId),
  schema: { designId },
});

describe("a design bundle", () => {
  test("is the design alone when nothing references a schema", () => {
    const system = graph([node("api", "service", "API")]);

    expect(flattenBundle(bundleOf(system))).toEqual(system);
  });

  test("puts each referenced schema's databases on the node that names it", () => {
    const system = graph([node("api", "service", "API"), named("db", "s1")]);
    const flat = flattenBundle({ system, schemas: { s1: orders } });

    expect(flat.nodes.map((item) => item.id)).toEqual([
      "api",
      "db",
      "customers",
      "orders",
    ]);
    expect(flat.edges).toEqual(orders.edges);
    expect(flat.groups).toEqual([
      { ...database("shop", "Shop", "postgres"), storedOn: "db" },
    ]);
  });

  test("takes a schema two nodes share once, on the first of them", () => {
    const system = graph([named("primary", "s1"), named("replica", "s1")]);

    expect(schemaReferences(system)).toEqual(new Map([["s1", "primary"]]));
    expect(
      flattenBundle({ system, schemas: { s1: orders } }).groups[0]?.storedOn,
    ).toBe("primary");
  });

  test("leaves out a schema it was not given", () => {
    const system = graph([named("db", "gone")]);

    expect(flattenBundle({ system, schemas: {} })).toEqual(system);
  });

  test("refuses a schema that reuses an id of the design", () => {
    const system = graph([named("orders", "s1")]);
    const bundle = { system, schemas: { s1: orders } };

    expect(bundleConflicts(bundle)).toEqual(["orders"]);
    expect(() => flattenBundle(bundle)).toThrow("share the ids orders");
  });
});

describe("splitting a design", () => {
  const combined = graph(
    [
      node("api", "service", "API"),
      node("db", "sql-database", "DB"),
      ...orders.nodes,
    ],
    [...orders.edges],
    [{ ...database("shop", "Shop", "postgres"), storedOn: "db" }],
  );

  test("moves each database that sits on a node into a schema of its own", () => {
    const { system, schemas } = splitSchemas(combined);

    expect(system.nodes.map((item) => item.id)).toEqual(["api", "db"]);
    expect(system.groups).toEqual([]);
    expect(system.edges).toEqual([]);
    expect(schemas).toEqual([{ holder: "db", graph: orders }]);
  });

  test("leaves a design whose databases sit on nothing as it is", () => {
    expect(splitSchemas(orders)).toEqual({ system: orders, schemas: [] });
  });

  test("flattens back to the design it came from", () => {
    const { system, schemas } = splitSchemas(combined);
    const named = {
      ...system,
      nodes: system.nodes.map((item) =>
        item.id === "db" ? { ...item, schema: { designId: "s1" } } : item,
      ),
    };
    const flat = flattenBundle({
      system: named,
      schemas: { s1: schemas[0]!.graph },
    });

    expect(flat.groups).toEqual(combined.groups);
    expect(flat.edges).toEqual(combined.edges);
    expect(flat.nodes.map(({ schema: _schema, ...item }) => item)).toEqual(
      combined.nodes,
    );
  });
});
