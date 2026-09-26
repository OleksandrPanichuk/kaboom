import {
  applyOps as applyLocally,
  createEdge,
  createNode,
  type DesignOp,
} from "@repo/design";
import { createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { applyOps, createDesign, type DesignBody, PATH } from "./helpers";

const addApiAndDb: DesignOp[] = [
  { op: "add-node", node: createNode("service", { id: "api" }) },
  { op: "add-node", node: createNode("sql-database", { id: "db" }) },
  {
    op: "add-edge",
    edge: createEdge({ id: "e1", from: "api", to: "db", kind: "write" }),
  },
];

describe("applying operations to a design", () => {
  test("applies a batch as the next revision", async () => {
    const user = await createUser();
    const design = await createDesign(user);

    const applied = await applyOps(user, design.id, 0, addApiAndDb);

    expect(applied.status).toBe(200);
    expect(applied.body.revision).toBe(1);
    expect(applied.body.graph.nodes.map((node) => node.id)).toEqual([
      "api",
      "db",
    ]);
    expect(applied.body.graphHash).not.toBe(design.graphHash);

    const stored = await user.get<DesignBody>(`${PATH}/${design.id}`);

    expect(stored.body).toMatchObject({
      revision: 1,
      graph: applied.body.graph,
      graphHash: applied.body.graphHash,
    });
  });

  test("fills the defaults a partial node leaves out", async () => {
    const user = await createUser();
    const design = await createDesign(user);

    const applied = await applyOps(user, design.id, 0, [
      { op: "add-node", node: { id: "api", kind: "service", label: "API" } },
    ]);

    expect(applied.body.graph.nodes[0]).toEqual(
      createNode("service", { id: "api", label: "API" }),
    );
  });

  test("refuses a stale base revision and says which one is current", async () => {
    const user = await createUser();
    const design = await createDesign(user);

    await applyOps(user, design.id, 0, addApiAndDb);

    const stale = await applyOps(user, design.id, 0, [
      { op: "remove-node", id: "api" },
    ]);

    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({
      code: "DESIGN_REVISION_CONFLICT",
      details: { revision: 1 },
    });
    expect(
      (await user.get<DesignBody>(`${PATH}/${design.id}`)).body.graph.nodes,
    ).toHaveLength(2);
  });

  test("lets exactly one of two writes on the same revision through", async () => {
    const user = await createUser();
    const design = await createDesign(user);

    const results = await Promise.all([
      applyOps(user, design.id, 0, [
        { op: "add-node", node: createNode("cache", { id: "a" }) },
      ]),
      applyOps(user, design.id, 0, [
        { op: "add-node", node: createNode("cache", { id: "b" }) },
      ]),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);

    const stored = await user.get<DesignBody>(`${PATH}/${design.id}`);

    expect(stored.body.revision).toBe(1);
    expect(stored.body.graph.nodes).toHaveLength(1);
  });

  test("applies nothing when one operation is refused, and says which", async () => {
    const user = await createUser();
    const design = await createDesign(user);

    const refused = await applyOps(user, design.id, 0, [
      { op: "add-node", node: createNode("service", { id: "api" }) },
      { op: "remove-node", id: "ghost" },
    ]);

    expect(refused.status).toBe(422);
    expect(refused.body).toMatchObject({
      code: "DESIGN_OP_REJECTED",
      details: { index: 1, reason: "unknown-node" },
    });
    expect(
      (await user.get<DesignBody>(`${PATH}/${design.id}`)).body,
    ).toMatchObject({ revision: 0, graph: { nodes: [] } });
  });

  test("refuses a malformed operation before touching the design", async () => {
    const user = await createUser();
    const design = await createDesign(user);

    const refused = await applyOps(user, design.id, 0, [
      { op: "teleport", id: "api" },
    ]);

    expect(refused.status).toBe(422);
    expect(refused.body).toMatchObject({
      code: "DESIGN_OP_REJECTED",
      details: { index: 0, reason: "invalid-op" },
    });
  });

  test("refuses an empty batch", async () => {
    const user = await createUser();
    const design = await createDesign(user);

    expect((await applyOps(user, design.id, 0, [])).status).toBe(422);
  });

  test("undoes a batch as a new revision", async () => {
    const user = await createUser();
    const design = await createDesign(user);

    await applyOps(user, design.id, 0, addApiAndDb);
    const local = applyLocally(design.graph, addApiAndDb);

    if (!local.ok) throw new Error("the batch should apply locally");

    const undone = await applyOps(user, design.id, 1, local.inverse);

    expect(undone.body.revision).toBe(2);
    expect(undone.body.graphHash).toBe(design.graphHash);
  });

  test("keeps another user's design out of reach", async () => {
    const owner = await createUser();
    const other = await createUser();
    const design = await createDesign(owner);

    expect((await applyOps(other, design.id, 0, addApiAndDb)).status).toBe(404);
  });
});
