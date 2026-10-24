import type { DesignGraph } from "@repo/design";
import { OFFICIAL_PROBLEMS } from "@repo/problem-library";
import type { TestReport } from "@repo/scoring";
import { createUser, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make, makeRepository } from "@/core/registry";
import { CreateDesignUseCase, DesignsRepository } from "@/modules/designs";
import { ProblemsService } from "@/modules/problems";
import {
  ProblemAttemptsRepository,
  SplitAttemptSchemasUseCase,
} from "@/modules/submissions";

import type { DesignBody } from "../designs/helpers";
import { start } from "./helpers";

const SLUG = "flash-sale-checkout";
const problem = OFFICIAL_PROBLEMS.find((item) => item.slug === SLUG)!;
const reference = problem.reference.graph;
const shop = reference.groups.find((group) => group.kind === "database")!;
const tables = reference.nodes.filter((node) => node.groupId === shop.id);
const placed = { x: 120, y: 340 };

const read = async (user: TestUser, id: string) =>
  (
    await user.get<
      DesignBody & { kind: string; name: string; layout: DesignBody["layout"] }
    >(`/api/designs/${id}`)
  ).body;

const startCombined = async (user: TestUser, graph: DesignGraph) => {
  const { problem: published, version } =
    await make(ProblemsService).getPublished(SLUG);
  const design = await make(CreateDesignUseCase).execute({
    ownerId: user.id,
    name: problem.title,
    origin: "problem",
    baseline: graph,
  });

  await makeRepository(DesignsRepository).saveLayout(design.id, user.id, {
    [tables[0]!.id]: placed,
  });
  await makeRepository(ProblemAttemptsRepository).insert({
    userId: user.id,
    problemId: published.id,
    problemVersion: version.version,
    designId: design.id,
  });

  return design.id;
};

const outcome = async (user: TestUser) =>
  (
    await user.post<{ report: TestReport }>(`/api/problems/${SLUG}/runs`)
  ).body.report.tests.map((item) => [item.id, item.status]);

const split = (apply: boolean) =>
  make(SplitAttemptSchemasUseCase).execute({ apply });

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("splitting attempts started before schemas were their own designs", () => {
  test("moves the tables into a schema design, and scores the attempt as before", async () => {
    const user = await createUser();
    const designId = await startCombined(user, reference);
    const before = await outcome(user);

    expect(before.length).toBeGreaterThan(0);
    expect(
      before
        .filter(([id]) => !id!.startsWith("chaos:"))
        .every(([, status]) => status === "passed"),
    ).toBe(true);

    const [result] = await split(true);

    expect(result).toMatchObject({
      designId,
      status: "split",
      schemas: [{ name: `${problem.title}: Orders DB`, tables: tables.length }],
    });

    const system = await read(user, designId);
    const schemaId = result!.schemas[0]!.designId!;

    expect(system.graph.groups).toEqual([]);
    expect(
      system.graph.nodes.find((node) => node.id === shop.storedOn)?.schema,
    ).toEqual({ designId: schemaId });
    expect(system.graph.nodes.some((node) => node.kind === "table")).toBe(
      false,
    );
    expect(system.layout[tables[0]!.id]).toBeUndefined();

    const schema = await read(user, schemaId);

    expect(schema.kind).toBe("schema");
    expect(schema.graph.nodes.map((node) => node.id).sort()).toEqual(
      tables.map((node) => node.id).sort(),
    );
    expect(schema.layout[tables[0]!.id]).toEqual(placed);
    expect(await outcome(user)).toEqual(before);
  });

  test("changes nothing on a dry run, and nothing the second time", async () => {
    const user = await createUser();
    const designId = await startCombined(user, problem.baseline);
    const graph = (await read(user, designId)).graph;
    const [planned] = await split(false);

    expect(planned).toMatchObject({ status: "would-split", designId });
    expect((await read(user, designId)).graph).toEqual(graph);

    await split(true);

    const revision = (await read(user, designId)).revision;
    const [again] = await split(true);

    expect(again).toMatchObject({
      status: "skipped",
      reason: "no tables to move",
    });
    expect((await read(user, designId)).revision).toBe(revision);
  });

  test("leaves attempts that already reference their schemas, or have no tables", async () => {
    const user = await createUser();

    await start(user, SLUG);
    await start(user);

    expect(
      (await split(true)).map(({ status, reason }) => ({ status, reason })),
    ).toEqual([
      { status: "skipped", reason: "no tables to move" },
      { status: "skipped", reason: "no tables to move" },
    ]);
  });
});
