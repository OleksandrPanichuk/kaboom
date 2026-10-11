import { createUser, type TestClient } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { DAY } from "@/constants";
import { make } from "@/core/registry";
import { solutionRevealsSchema } from "@/db";
import { getExecutor } from "@/db/executor";
import { ProblemsService } from "@/modules/problems";

import { buildReference, start } from "./helpers";

const PATH = "/api/problems/url-shortener";

interface Solutions {
  lockedUntil: string | null;
  solutions: Array<{
    score: number;
    graph: { nodes: Array<{ id: string; notes: string }> };
    submittedAt: string;
  }>;
}

interface Submission {
  score: number;
  counted: boolean;
  allPassed: boolean;
}

interface Attempt {
  lockedUntil: string | null;
  solved: boolean;
}

interface Progress {
  points: number;
  problems: Array<{
    slug: string;
    bestScore: number;
    lockedUntil: string | null;
  }>;
}

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

const solve = async (user: TestClient) => {
  const attempt = await start(user);
  const revision = await buildReference(user, attempt);

  return user.post<Submission>(`${PATH}/submissions`, { revision });
};

const reveal = (user: TestClient) =>
  user.post<Solutions>(`${PATH}/solutions/reveal`);

const progressOf = async (user: TestClient) =>
  (await user.get<Progress>("/api/progress")).body.problems.find(
    (problem) => problem.slug === "url-shortener",
  );

describe("other solvers' solutions", () => {
  test("shows each other solver's best solution scoring 80 or more, without its notes", async () => {
    const solver = await createUser();
    const beginner = await createUser();
    const viewer = await createUser();

    expect((await solve(solver)).body.score).toBe(100);
    await start(beginner);
    await beginner.post(`${PATH}/submissions`, {});

    const shown = await reveal(viewer);

    expect(shown.status).toBe(200);
    expect(shown.body.solutions.map((solution) => solution.score)).toEqual([
      100,
    ]);
    expect(
      shown.body.solutions[0]!.graph.nodes.every((node) => node.notes === ""),
    ).toBe(true);
    expect(
      new Date(shown.body.lockedUntil!).getTime() - Date.now(),
    ).toBeGreaterThan(6.9 * DAY);
  });

  test("never shows a solver their own solution", async () => {
    const solver = await createUser();

    await solve(solver);

    expect((await reveal(solver)).body.solutions).toEqual([]);
  });

  test("a submission within seven days of looking is scored but does not count", async () => {
    const viewer = await createUser();

    await reveal(viewer);

    const submitted = await solve(viewer);
    const attempt = await viewer.get<{ lockedUntil: string | null }>(
      `${PATH}/attempt`,
    );
    const progress = await progressOf(viewer);

    expect(submitted.body).toMatchObject({ score: 100, counted: false });
    expect(attempt.body.lockedUntil).not.toBeNull();
    expect(progress).toMatchObject({ bestScore: 0 });
    expect(progress?.lockedUntil).not.toBeNull();
  });

  test("open without a lock once a submission passed every test", async () => {
    const solver = await createUser();
    const other = await createUser();

    await solve(other);
    expect((await solver.get<Attempt>(`${PATH}/attempt`)).status).not.toBe(200);
    expect((await solve(solver)).body).toMatchObject({
      score: 100,
      allPassed: true,
    });
    expect((await solver.get<Attempt>(`${PATH}/attempt`)).body).toMatchObject({
      solved: true,
      lockedUntil: null,
    });

    const shown = await reveal(solver);
    const again = await solver.post<Submission>(`${PATH}/submissions`, {});

    expect(shown.body.lockedUntil).toBeNull();
    expect(shown.body.solutions).toHaveLength(1);
    expect(again.body.counted).toBe(true);
    expect(await progressOf(solver)).toMatchObject({
      bestScore: 100,
      lockedUntil: null,
    });
  });

  test("still lock after a submission that failed a test, keeping its points", async () => {
    const trier = await createUser();

    await start(trier);

    const partial = await trier.post<Submission>(`${PATH}/submissions`, {});

    expect(partial.body.allPassed).toBe(false);
    expect((await trier.get<Attempt>(`${PATH}/attempt`)).body.solved).toBe(
      false,
    );
    expect((await reveal(trier)).body.lockedUntil).not.toBeNull();
    expect((await solve(trier)).body.counted).toBe(false);
  });

  test("counts again once seven days have passed since the last look", async () => {
    const viewer = await createUser();

    await reveal(viewer);
    await getExecutor()
      .update(solutionRevealsSchema)
      .set({ revealedAt: new Date(Date.now() - 8 * DAY) })
      .where(eq(solutionRevealsSchema.userId, viewer.id));

    const submitted = await solve(viewer);

    expect(submitted.body.counted).toBe(true);
    expect(await progressOf(viewer)).toMatchObject({
      bestScore: 100,
      lockedUntil: null,
    });
  });
});
