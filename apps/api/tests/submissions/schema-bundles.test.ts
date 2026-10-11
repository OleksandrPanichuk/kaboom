import type { DesignOp } from "@repo/design";
import { OFFICIAL_PROBLEMS } from "@repo/problem-library";
import type { TestReport } from "@repo/scoring";
import { createUser, type TestClient } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make, makeRepository } from "@/core/registry";
import { ProblemsService } from "@/modules/problems";
import { SubmissionsRepository } from "@/modules/submissions";

import { applyOps, type DesignBody } from "../designs/helpers";
import { start } from "./helpers";

const SLUG = "flash-sale-checkout";
const PATH = `/api/problems/${SLUG}`;
const problem = OFFICIAL_PROBLEMS.find((item) => item.slug === SLUG)!;
const reference = problem.reference.graph;
const shop = reference.groups.find((group) => group.kind === "database")!;
const inShop = (groupId: string | null) => groupId === shop.id;
const tables = reference.nodes.filter((node) => inShop(node.groupId));
const relations = reference.edges.filter((edge) => edge.kind === "relation");

const createSchema = async (user: TestClient) => {
  const created = await user.post<DesignBody>("/api/designs", {
    name: "Shop tables",
    kind: "schema",
  });
  const { storedOn: _storedOn, ...group } = shop;
  const applied = await applyOps(user, created.body.id, 0, [
    { op: "add-group", group },
    ...tables.map((node): DesignOp => ({ op: "add-node", node })),
    ...relations.map((edge): DesignOp => ({ op: "add-edge", edge })),
  ]);

  expect(applied.status).toBe(200);

  return { id: created.body.id, revision: applied.body.revision };
};

const buildSystemNaming = async (
  user: TestClient,
  designId: string,
  schemaId: string,
) => {
  const design = (await user.get<DesignBody>(`/api/designs/${designId}`)).body;
  const present = new Set(design.graph.nodes.map((node) => node.id));
  const system = reference.nodes.filter((node) => !inShop(node.groupId));
  const ops: DesignOp[] = [
    ...design.graph.nodes
      .filter((node) => inShop(node.groupId))
      .map((node): DesignOp => ({ op: "remove-node", id: node.id })),
    { op: "remove-group", id: shop.id },
    ...system.map((node): DesignOp =>
      present.has(node.id)
        ? { op: "update-node", id: node.id, patch: { props: node.props } }
        : { op: "add-node", node },
    ),
    ...reference.edges
      .filter((edge) => edge.kind !== "relation")
      .map((edge): DesignOp => ({ op: "add-edge", edge })),
    {
      op: "update-node",
      id: shop.storedOn!,
      patch: { schema: { designId: schemaId } },
    },
  ];
  const applied = await applyOps(user, designId, design.revision, ops);

  expect(applied.status).toBe(200);
  expect(applied.body.graph.groups).toEqual([]);

  return applied.body.revision;
};

const run = async (user: TestClient) =>
  (await user.post<{ report: TestReport }>(`${PATH}/runs`)).body.report;

const SCHEMA_DRILLS = new Set(
  problem.drills
    .filter((drill) => drill.kind === "schema")
    .map((drill) => `drill:${drill.id}`),
);

const schemaTests = (report: TestReport) =>
  report.tests.filter((item) => SCHEMA_DRILLS.has(item.id));

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("a design whose database names a schema", () => {
  test("is scored with the schema's tables, as the schema stands at that moment", async () => {
    const user = await createUser();
    const attempt = await start(user, SLUG);
    const schema = await createSchema(user);
    const revision = await buildSystemNaming(user, attempt.designId, schema.id);

    expect(schemaTests(await run(user)).length).toBeGreaterThan(0);
    expect(
      schemaTests(await run(user)).every((item) => item.status === "passed"),
    ).toBe(true);

    const submitted = await user.post<{ id: string; score: number }>(
      `${PATH}/submissions`,
      { revision },
    );

    expect(submitted.status).toBe(200);
    expect(submitted.body.score).toBe(100);

    const lines = tables.find((node) => node.id === "order_lines")!;
    const changed = await applyOps(user, schema.id, schema.revision, [
      { op: "remove-node", id: lines.id },
    ]);

    expect(changed.status).toBe(200);
    expect(
      schemaTests(await run(user)).some((item) => item.status === "failed"),
    ).toBe(true);

    const stored = await makeRepository(SubmissionsRepository).findById(
      submitted.body.id,
    );

    expect(Object.keys(stored!.schemas)).toEqual([schema.id]);
    expect(
      stored!.schemas[schema.id]!.nodes.map((node) => node.id).sort(),
    ).toEqual(tables.map((node) => node.id).sort());
  });

  test("loses the tables once the reference is cleared", async () => {
    const user = await createUser();
    const attempt = await start(user, SLUG);
    const schema = await createSchema(user);
    const revision = await buildSystemNaming(user, attempt.designId, schema.id);

    await applyOps(user, attempt.designId, revision, [
      { op: "update-node", id: shop.storedOn!, patch: { schema: null } },
    ]);

    expect(
      schemaTests(await run(user)).every((item) => item.status === "failed"),
    ).toBe(true);
  });

  test("is refused when the schema reuses an id the design has", async () => {
    const user = await createUser();
    const attempt = await start(user, SLUG);
    const schema = await createSchema(user);
    const revision = await buildSystemNaming(user, attempt.designId, schema.id);
    const customers = tables.find((node) => node.id === "customers")!;

    await applyOps(user, attempt.designId, revision, [
      { op: "add-node", node: { ...customers, groupId: null } },
    ]);

    const refused = await user.post<{ code: string }>(`${PATH}/runs`);

    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe("DESIGN_SCHEMA_CONFLICT");
  });
});
