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
    displayName: string;
    avatarUrl: string | null;
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
  user.patch("/api/profiles/me", { handle, visible });

const board = (user: TestUser, query = "") =>
  user.get<Board>(`/api/leaderboard${query}`);

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("the leaderboard", () => {
  test("is empty, and gives no place to someone without points, before anyone scores", async () => {
    const user = await createUser({ name: "Ada Lovelace" });
    const response = await board(user);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      entries: [],
      me: { visible: true, points: 0, position: null },
    });
    expect(response.body.me.handle).toMatch(/^ada-lovelac-[0-9a-f]{8}$/);
  });

  test("lists everyone visible by display name and handle, sharing a place on a tie", async () => {
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
      {
        position: 1,
        handle: "ada",
        displayName: "Ada Lovelace",
        avatarUrl: null,
        points: 100,
        solved: 1,
        rank: "Middle",
      },
      {
        position: 1,
        handle: "grace",
        displayName: "Grace Hopper",
        avatarUrl: null,
        points: 100,
        solved: 1,
        rank: "Middle",
      },
    ]);
    expect(JSON.stringify(seen.body)).not.toContain(ada.email);
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

  test("needs a session", async () => {
    expect((await createGuest().get("/api/leaderboard")).status).toBe(401);
  });
});
