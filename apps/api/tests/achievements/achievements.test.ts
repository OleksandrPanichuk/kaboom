import { createGuest, createUser, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { make } from "@/core/registry";
import { getDatabase, submissionsSchema } from "@/db";
import { ProblemsService } from "@/modules/problems";

import { startInterview } from "../interviews/helpers";
import { buildReference, start } from "../submissions/helpers";

interface Achievements {
  streak: { current: number; longest: number; activeToday: boolean };
  badges: Array<{
    key: string;
    earnedAt: string | null;
    progress: { value: number; target: number };
  }>;
}

const PATH = "/api/achievements/me";

const mine = async (user: TestUser) =>
  (await user.get<Achievements>(PATH)).body;

const badge = (body: Achievements, key: string) =>
  body.badges.find((item) => item.key === key)!;

const solve = async (user: TestUser) => {
  const attempt = await start(user);
  const revision = await buildReference(user, attempt);

  await user.post("/api/problems/url-shortener/submissions", { revision });
};

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("achievements", () => {
  test("a new account has no streak and no badge", async () => {
    const user = await createUser();
    const body = await mine(user);

    expect(body.streak).toEqual({ current: 0, longest: 0, activeToday: false });
    expect(body.badges.every((item) => item.earnedAt === null)).toBe(true);
    expect(body.badges.map((item) => item.key)).toEqual([
      "first-solve",
      "solver-10",
      "sharp-shooter",
      "every-track",
      "first-interview",
      "streak-7",
      "streak-30",
      "author",
    ]);
  });

  test("starting an interview is a day of practice", async () => {
    const user = await createUser();

    await startInterview(user);

    expect((await mine(user)).streak).toEqual({
      current: 1,
      longest: 1,
      activeToday: true,
    });
  });

  test("passing every test of a problem earns the first solve, once", async () => {
    const user = await createUser();

    await solve(user);

    const body = await mine(user);

    expect(badge(body, "first-solve").earnedAt).not.toBeNull();
    expect(badge(body, "solver-10").progress).toEqual({ value: 1, target: 10 });
    expect(badge(body, "every-track").progress).toEqual({
      value: 1,
      target: 3,
    });
    expect(body.streak.current).toBe(1);
  });

  test("a solve that was not counted still passed, but is no sharp score", async () => {
    const user = await createUser();

    await solve(user);
    await getDatabase()
      .update(submissionsSchema)
      .set({ counted: false })
      .where(eq(submissionsSchema.userId, user.id));

    const body = await mine(user);

    expect(badge(body, "first-solve").earnedAt).not.toBeNull();
    expect(badge(body, "sharp-shooter").earnedAt).toBeNull();
  });

  test("one person's practice is not another's", async () => {
    const busy = await createUser();
    const idle = await createUser();

    await solve(busy);

    expect((await mine(idle)).streak.current).toBe(0);
  });

  test("asks for a session", async () => {
    expect((await createGuest().get(PATH)).status).toBe(401);
  });
});
