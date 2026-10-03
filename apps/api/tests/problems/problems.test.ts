import { OFFICIAL_PROBLEMS } from "@repo/design/library";
import { createGuest, createUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { make } from "@/core/registry";
import { getDatabase, problemsSchema } from "@/db";
import {
  hashProblem,
  ProblemsRepository,
  ProblemsService,
} from "@/modules/problems";

const PATH = "/api/problems";

interface Summary {
  slug: string;
  title: string;
  difficulty: string;
  source: string;
  version: number;
}

interface Problem extends Summary {
  statement: string;
  baseline: { nodes: Array<{ id: string }> };
  drills: Array<{
    id: string;
    title: string;
    description: string;
    visibility: string;
  }>;
  rubric: Array<{ key: string; weight: number }>;
}

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("problems", () => {
  test("lists the official problems, oldest first", async () => {
    const user = await createUser();

    const listed = await user.get<{
      items: Summary[];
      nextCursor: string | null;
    }>(PATH);

    expect(listed.status).toBe(200);
    expect(listed.body.items.map((item) => item.slug)).toEqual(
      OFFICIAL_PROBLEMS.map((problem) => problem.slug),
    );
    expect(listed.body.items[0]).toMatchObject({
      title: "URL shortener",
      difficulty: "easy",
      source: "official",
      version: 1,
    });
  });

  test("filters by difficulty", async () => {
    const user = await createUser();

    const medium = await user.get<{ items: Summary[] }>(
      `${PATH}?difficulty=medium`,
    );

    expect(medium.body.items.map((item) => item.slug).sort()).toEqual(
      OFFICIAL_PROBLEMS.filter((problem) => problem.difficulty === "medium")
        .map((problem) => problem.slug)
        .sort(),
    );
  });

  test("filters by track, and refuses a track that does not exist", async () => {
    const user = await createUser();

    const devops = await user.get<{ items: Summary[] }>(`${PATH}?track=devops`);
    const unknown = await user.get(`${PATH}?track=frontend`);

    expect(devops.body.items.map((item) => item.slug)).toEqual([
      "zero-downtime-rollout",
    ]);
    expect(unknown.status).toBe(422);
  });

  test("shows a problem without what solvers must not see", async () => {
    const user = await createUser();

    const problem = await user.get<Problem>(`${PATH}/url-shortener`);
    const raw = JSON.stringify(problem.body);

    expect(problem.status).toBe(200);
    expect(problem.body.statement).toContain("bit.ly");
    expect(problem.body.baseline.nodes.map((node) => node.id)).toEqual([
      "users",
    ]);
    expect(
      problem.body.drills.map((drill) => [drill.id, drill.visibility]),
    ).toEqual([
      ["normal-day", "public"],
      ["viral-link", "public"],
      ["primary-fails", "hidden"],
      ["cache-flush", "hidden"],
    ]);
    expect(
      problem.body.drills
        .filter((drill) => drill.visibility === "hidden")
        .every((drill) => drill.description === ""),
    ).toBe(true);
    expect(
      problem.body.rubric.reduce((sum, item) => sum + item.weight, 0),
    ).toBe(100);
    expect(raw).not.toContain("reference");
    expect(raw).not.toContain("node-down");
    expect(raw).not.toContain("endAvailability");
  });

  test("answers 404 for a problem that does not exist, and 401 to a guest", async () => {
    const user = await createUser();

    expect((await user.get(`${PATH}/no-such-problem`)).status).toBe(404);
    expect((await createGuest().get(PATH)).status).toBe(401);
  });

  test("syncs official problems once, and versions them when their content changes", async () => {
    const service = make(ProblemsService);
    const repository = make(ProblemsRepository);
    const original = OFFICIAL_PROBLEMS[0]!;

    expect(await service.syncOfficial()).toEqual(
      Object.fromEntries(
        OFFICIAL_PROBLEMS.map((problem) => [problem.slug, "unchanged"]),
      ),
    );

    const edited = {
      ...original,
      summary: "Shorter links, now with a new summary.",
    };

    expect(
      await repository.syncOfficial({
        content: edited,
        contentHash: hashProblem(edited),
      }),
    ).toBe("versioned");

    const [row] = await getDatabase()
      .select()
      .from(problemsSchema)
      .where(eq(problemsSchema.slug, original.slug));
    const first = await service.getVersion(row!.id, 1);
    const second = await service.getVersion(row!.id, 2);

    expect(row).toMatchObject({ currentVersion: 2, summary: edited.summary });
    expect(first.content.summary).toBe(original.summary);
    expect(first.contentHash).toBe(hashProblem(original));
    expect(second.content.summary).toBe(edited.summary);
  });
});
