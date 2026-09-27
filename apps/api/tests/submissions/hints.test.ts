import { OFFICIAL_PROBLEMS } from "@repo/design";
import { createUser, type TestClient } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make } from "@/core/registry";
import { ProblemsService } from "@/modules/problems";

const shortener = OFFICIAL_PROBLEMS.find(
  (problem) => problem.slug === "url-shortener",
)!;
const PATH = "/api/problems/url-shortener";

interface Hint {
  index: number;
  title: string;
  body: string;
  cost: number;
}

interface Attempt {
  designId: string;
  hints: Hint[];
  hintPenalty: number;
}

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

const reveal = (user: TestClient, index: number) =>
  user.post<Hint & { code?: string }>(`${PATH}/hints/${index}`);

describe("hints", () => {
  test("shows a problem's hints by title and cost, never by what they say", async () => {
    const user = await createUser();
    const problem = await user.get<{ hints: Array<Omit<Hint, "body">> }>(PATH);

    expect(problem.body.hints).toEqual(
      shortener.hints.map(({ title, cost }, index) => ({ index, title, cost })),
    );
    expect(JSON.stringify(problem.body)).not.toContain(
      shortener.hints[0]!.body,
    );
  });

  test("reveals hints in order, and reading one again costs nothing", async () => {
    const user = await createUser();

    await user.post(`${PATH}/start`);

    const skipped = await reveal(user, 1);
    const first = await reveal(user, 0);
    const again = await reveal(user, 0);
    const attempt = await user.get<Attempt>(`${PATH}/attempt`);

    expect(skipped.status).toBe(409);
    expect(skipped.body.code).toBe("HINT_OUT_OF_ORDER");
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ index: 0, ...shortener.hints[0]! });
    expect(again.body).toEqual(first.body);
    expect(attempt.body.hints).toEqual([first.body]);
    expect(attempt.body.hintPenalty).toBe(shortener.hints[0]!.cost);
  });

  test("answers 404 past the last hint, and 404 before the problem is started", async () => {
    const user = await createUser();
    const early = await reveal(user, 0);

    await user.post(`${PATH}/start`);

    const past = await reveal(user, shortener.hints.length);

    expect(early.status).toBe(404);
    expect(past.status).toBe(404);
    expect(past.body.code).toBe("HINT_NOT_FOUND");
  });

  test("takes the cost of every hint revealed before a submission off its score", async () => {
    const user = await createUser();

    await user.post(`${PATH}/start`);

    const before = await user.post<{ score: number; hintPenalty: number }>(
      `${PATH}/submissions`,
      {},
    );

    await reveal(user, 0);
    await reveal(user, 1);

    const after = await user.post<{ score: number; hintPenalty: number }>(
      `${PATH}/submissions`,
      {},
    );

    expect(before.body.hintPenalty).toBe(0);
    expect(after.body.hintPenalty).toBe(
      shortener.hints[0]!.cost + shortener.hints[1]!.cost,
    );
    expect(after.body.score).toBe(0);
  });
});
