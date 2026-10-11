import { createNode, type DesignOp } from "@repo/design";
import { createUser, type TestClient } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import {
  applyOps,
  createDesign,
  type DesignBody,
  type ErrorBody,
  PATH,
} from "./helpers";

const schema = async (
  client: TestClient,
  engine: "postgres" | "mongodb",
): Promise<DesignBody> => {
  const created = await client.post<DesignBody>(PATH, {
    name: `${engine} schema`,
    kind: "schema",
  });
  const applied = await applyOps(client, created.body.id, 0, [
    {
      op: "add-group",
      group: {
        id: "store",
        kind: "database",
        label: "Store",
        parentId: null,
        engine,
      },
    },
    {
      op: "add-node",
      node:
        engine === "mongodb"
          ? createNode("collection", { id: "orders", groupId: "store" })
          : createNode("table", { id: "orders", groupId: "store" }),
    },
  ]);

  expect(applied.status).toBe(200);

  return created.body;
};

const system = async (client: TestClient) => {
  const design = await createDesign(client, "Checkout");

  await applyOps(client, design.id, 0, [
    { op: "add-node", node: createNode("service", { id: "api" }) },
    { op: "add-node", node: createNode("sql-database", { id: "db" }) },
  ]);

  return design;
};

const name = (designId: string | null): DesignOp => ({
  op: "update-node",
  id: "db",
  patch: { schema: designId === null ? null : { designId } },
});

describe("a schema design", () => {
  test("is created and listed by its kind", async () => {
    const user = await createUser();
    const created = await schema(user, "postgres");

    await createDesign(user, "A system");

    const schemas = await user.get<{
      items: Array<{ id: string; kind: string }>;
    }>(`${PATH}?kind=schema`);

    expect(created).toMatchObject({ kind: "schema" });
    expect(schemas.body.items.map((item) => item.id)).toEqual([created.id]);
  });

  test("holds only databases and what they hold", async () => {
    const user = await createUser();
    const created = await schema(user, "postgres");
    const refused = await applyOps(user, created.id, 1, [
      { op: "add-node", node: createNode("service", { id: "api" }) },
    ]);

    expect(refused.status).toBe(422);
    expect((refused.body as unknown as ErrorBody).code).toBe(
      "DESIGN_OP_REJECTED",
    );
  });
});

describe("a database naming its schema", () => {
  test("names a schema of its family, and drops it with null", async () => {
    const user = await createUser();
    const sql = await schema(user, "postgres");
    const design = await system(user);
    const named = await applyOps(user, design.id, 1, [name(sql.id)]);

    expect(named.status).toBe(200);
    expect(
      named.body.graph.nodes.find((node) => node.id === "db")?.schema,
    ).toEqual({ designId: sql.id });

    const dropped = await applyOps(user, design.id, 2, [name(null)]);

    expect(
      dropped.body.graph.nodes.find((node) => node.id === "db")?.schema,
    ).toBeUndefined();
  });

  test("refuses a schema of the wrong family, a system, or someone else's", async () => {
    const user = await createUser();
    const other = await createUser();
    const documents = await schema(user, "mongodb");
    const theirs = await schema(other, "postgres");
    const design = await system(user);

    for (const target of [documents.id, design.id, theirs.id]) {
      const refused = await applyOps(user, design.id, 1, [name(target)]);
      const body = refused.body as unknown as ErrorBody;

      expect(refused.status).toBe(422);
      expect(body.code).toBe("DESIGN_OP_REJECTED");
    }

    const wrong = await applyOps(user, design.id, 1, [name(documents.id)]);

    expect((wrong.body as unknown as ErrorBody).error).toContain("own family");
  });
});
