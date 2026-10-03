import { createGuest, createUser, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { make } from "@/core/registry";
import { getDatabase, submissionsSchema } from "@/db";
import { ProblemsService } from "@/modules/problems";

import { buildReference, start } from "../submissions/helpers";

interface Board {
  entries: Array<{
    position: number;
    handle: string;
    points: number;
    solved: number;
    rank: string | null;
  }>;
  me: {
    handle: string | null;
    visible: boolean;
    points: number;
    solved: number;
    position: number | null;
  };
}

const solveShortener = async (user: TestUser) => {
  const attempt = await start(user);
  const revision = await buildReference(user, attempt);

  await user.post("/api/problems/url-shortener/submissions", { revision });
};

const join = (user: TestUser, handle: string, visible = true) =>
  user.put<{ handle: string; visible: boolean; code?: string }>(
    "/api/leaderboard/me",
    {
      handle,
      visible,
    },
  );

const board = (user: TestUser, query = "") =>
  user.get<Board>(`/api/leaderboard${query}`);

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("the leaderboard", () => {
  test("is empty, and says the caller is not on it, before anyone joins", async () => {
    const user = await createUser();
    const response = await board(user);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      entries: [],
      me: { handle: null, visible: false, points: 0, position: null },
    });
  });

  test("lists only people who chose a handle and to be shown, sharing a place on a tie", async () => {
    const ada = await createUser({ name: "Ada Lovelace" });
    const grace = await createUser({ name: "Grace Hopper" });
    const hidden = await createUser();

    for (const user of [ada, grace, hidden]) await solveShortener(user);

    await join(ada, "ada");
    await join(grace, "grace");
    await join(hidden, "shy", false);

    const seen = await board(ada);
    const mine = await board(hidden);

    expect(seen.body.entries).toEqual([
      { position: 1, handle: "ada", points: 100, solved: 1, rank: "Middle" },
      { position: 1, handle: "grace", points: 100, solved: 1, rank: "Middle" },
    ]);
    expect(JSON.stringify(seen.body)).not.toContain("Ada Lovelace");
    expect(mine.body.me).toEqual({
      handle: "shy",
      visible: false,
      points: 100,
      solved: 1,
      position: null,
    });
  });

  test("counts only the last seven days this week, and only a track's problems by track", async () => {
    const ada = await createUser();

    await solveShortener(ada);
    await join(ada, "ada");
    await getDatabase()
      .update(submissionsSchema)
      .set({ createdAt: new Date(Date.now() - 10 * 86_400_000) })
      .where(eq(submissionsSchema.userId, ada.id));

    expect((await board(ada)).body.entries).toHaveLength(1);
    expect((await board(ada, "?period=week")).body).toMatchObject({
      entries: [],
      me: { points: 0, position: null },
    });
    expect((await board(ada, "?track=devops")).body.entries).toEqual([]);
    expect(
      (await board(ada, "?track=system-design")).body.entries[0],
    ).toMatchObject({ handle: "ada", rank: null });
  });

  test("keeps a handle to one person, and refuses one that breaks the pattern", async () => {
    const ada = await createUser();
    const grace = await createUser();

    expect((await join(ada, "ada")).status).toBe(200);
    expect((await join(ada, "ada", false)).body).toEqual({
      handle: "ada",
      visible: false,
    });

    const taken = await join(grace, "ada");

    expect(taken.status).toBe(409);
    expect(taken.body.code).toBe("HANDLE_TAKEN");
    expect((await join(grace, "A")).status).toBe(422);
    expect((await join(grace, "-grace")).status).toBe(422);
  });

  test("needs a session", async () => {
    expect((await createGuest().get("/api/leaderboard")).status).toBe(401);
  });
});
