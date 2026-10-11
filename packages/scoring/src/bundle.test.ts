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
