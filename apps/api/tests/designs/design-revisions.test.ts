import { createNode, type DesignGraph } from "@repo/design";
import { createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import type { MemoryErrorReporter } from "@/adapters/error-reporting/memory.error-reporter";
import { make } from "@/core/registry";
import { getDatabase } from "@/db";
import { ErrorReporter } from "@/platform/error-reporting";

import { applyOps, createDesign, PATH } from "./helpers";

interface RevisionBody {
  number: number;
  author: string;
  opCount: number;
  graphHash: string;
  graph: DesignGraph;
}

interface RevisionPage {
  items: Array<Omit<RevisionBody, "graph">>;
  nextCursor: string | null;
}

const buildHistory = async () => {
  const user = await createUser();
  const design = await createDesign(user);
  const graphs = [design.graph];

  for (const [index, kind] of (
    ["service", "cache", "queue"] as const
  ).entries()) {
    const applied = await applyOps(user, design.id, index, [
      { op: "add-node", node: createNode(kind, { id: kind }) },
    ]);

    graphs.push(applied.body.graph);
  }

  return { user, design, graphs };
};

describe("design revisions", () => {
  test("replays every revision to the graph it produced", async () => {
    const { user, design, graphs } = await buildHistory();

    for (const [number, graph] of graphs.entries()) {
      const revision = await user.get<RevisionBody>(
        `${PATH}/${design.id}/revisions/${number}`,
      );

      expect(revision.status).toBe(200);
      expect(revision.body.graph).toEqual(graph);
    }
  });

  test("lists revisions newest first, a page at a time", async () => {
    const { user, design } = await buildHistory();

    const first = await user.get<RevisionPage>(
      `${PATH}/${design.id}/revisions?limit=2`,
    );
    const second = await user.get<RevisionPage>(
      `${PATH}/${design.id}/revisions?limit=2&cursor=${encodeURIComponent(first.body.nextCursor!)}`,
    );

    expect(first.body.items.map((revision) => revision.number)).toEqual([3, 2]);
    expect(second.body.items).toMatchObject([
      { number: 1, author: "user", opCount: 1 },
      { number: 0, author: "system", opCount: 0 },
    ]);
    expect(second.body.nextCursor).toBeNull();
  });

  test("answers 404 for a revision that does not exist yet", async () => {
    const { user, design } = await buildHistory();

    const missing = await user.get(`${PATH}/${design.id}/revisions/4`);

    expect(missing.status).toBe(404);
  });

  test("keeps another user's revisions out of reach", async () => {
    const { design } = await buildHistory();
    const other = await createUser();

    expect((await other.get(`${PATH}/${design.id}/revisions`)).status).toBe(
      404,
    );
    expect((await other.get(`${PATH}/${design.id}/revisions/1`)).status).toBe(
      404,
    );
  });

  test("reports a stored revision that no longer replays to its hash", async () => {
    const { user, design } = await buildHistory();

    await getDatabase().execute(
      sql`update design_revisions set ops = '[]'::jsonb where design_id = ${design.id} and number = 2`,
    );

    const corrupted = await user.get(`${PATH}/${design.id}/revisions/3`);
    const reporter = make(ErrorReporter) as MemoryErrorReporter;

    expect(corrupted.status).toBe(500);
    expect(reporter.reports()).toHaveLength(1);
  });
});
