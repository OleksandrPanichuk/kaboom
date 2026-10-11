import type { DesignGraph, DesignOp } from "@repo/design";
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
const holder = shop.storedOn!;
const inShop = (groupId: string | null) => groupId === shop.id;
const tables = reference.nodes.filter((node) => inShop(node.groupId));

const SCHEMA_DRILLS = new Set(
  problem.drills
    .filter((drill) => drill.kind === "schema")
    .map((drill) => `drill:${drill.id}`),
);

const read = async (user: TestClient, id: string) =>
  (await user.get<DesignBody & { kind: string }>(`/api/designs/${id}`)).body;

const schemaOf = (graph: DesignGraph) =>
  graph.nodes.find((node) => node.id === holder)?.schema?.designId;

const finish = async (
  user: TestClient,
  id: string,
  nodes: DesignGraph["nodes"],
  edges: DesignGraph["edges"],
) => {
  const design = await read(user, id);
  const present = new Set(design.graph.nodes.map((node) => node.id));
  const applied = await applyOps(user, id, design.revision, [
    ...nodes.map((node): DesignOp =>
      present.has(node.id)
        ? { op: "update-node", id: node.id, patch: { props: node.props } }
        : { op: "add-node", node },
    ),
    ...edges.map((edge): DesignOp => ({ op: "add-edge", edge })),
  ]);

  expect(applied.status).toBe(200);

  return applied.body.revision;
};

const solve = async (user: TestClient) => {
  const attempt = await start(user, SLUG);
  const schemaId = schemaOf((await read(user, attempt.designId)).graph)!;
  const schemaRevision = await finish(
    user,
    schemaId,
    tables,
    reference.edges.filter((edge) => edge.kind === "relation"),
  );
  const revision = await finish(
    user,
    attempt.designId,
    reference.nodes.filter((node) => !inShop(node.groupId)),
    reference.edges.filter((edge) => edge.kind !== "relation"),
  );

  return { attempt, schemaId, schemaRevision, revision };
};

const run = async (user: TestClient) =>
  (await user.post<{ report: TestReport }>(`${PATH}/runs`)).body.report;

const schemaTests = (report: TestReport) =>
  report.tests.filter((item) => SCHEMA_DRILLS.has(item.id));

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("an attempt at a problem whose database holds tables", () => {
  test("starts with the tables in a schema design of the solver's own", async () => {
    const user = await createUser();
    const attempt = await start(user, SLUG);
    const system = await read(user, attempt.designId);
    const schemaId = schemaOf(system.graph);

    expect(system.graph.groups).toEqual([]);
    expect(system.graph.nodes.some((node) => inShop(node.groupId))).toBe(false);
    expect(schemaId).toBeString();

    const schema = await read(user, schemaId!);

    expect(schema.kind).toBe("schema");
    expect(schema.name).toBe(`${problem.title}: Orders DB`);
    expect(schema.graph.groups.map((group) => group.id)).toEqual([shop.id]);
    expect(schema.graph.nodes.map((node) => node.id).sort()).toEqual(
      problem.baseline.nodes
        .filter((node) => inShop(node.groupId))
        .map((node) => node.id)
        .sort(),
    );
    expect((await start(user, SLUG)).designId).toBe(attempt.designId);
  });

  test("is scored with the schema's tables, as the schema stands at that moment", async () => {
    const user = await createUser();
    const { schemaId, schemaRevision, revision } = await solve(user);

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

    const changed = await applyOps(user, schemaId, schemaRevision, [
      { op: "remove-node", id: "order_lines" },
    ]);

    expect(changed.status).toBe(200);
    expect(
      schemaTests(await run(user)).some((item) => item.status === "failed"),
    ).toBe(true);

    const stored = await makeRepository(SubmissionsRepository).findById(
      submitted.body.id,
    );

    expect(Object.keys(stored!.schemas)).toEqual([schemaId]);
    expect(
      stored!.schemas[schemaId]!.nodes.map((node) => node.id).sort(),
    ).toEqual(tables.map((node) => node.id).sort());
  });

  test("loses the tables once the reference is cleared", async () => {
    const user = await createUser();
    const { attempt, revision } = await solve(user);

    await applyOps(user, attempt.designId, revision, [
      { op: "update-node", id: holder, patch: { schema: null } },
    ]);

    expect(
      schemaTests(await run(user)).every((item) => item.status === "failed"),
    ).toBe(true);
  });

  test("is refused when the schema reuses an id the design has", async () => {
    const user = await createUser();
    const { attempt, revision } = await solve(user);
    const customers = tables.find((node) => node.id === "customers")!;

    await applyOps(user, attempt.designId, revision, [
      { op: "add-node", node: { ...customers, groupId: null } },
    ]);

    const refused = await user.post<{ code: string }>(`${PATH}/runs`);

    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe("DESIGN_SCHEMA_CONFLICT");
  });
});
