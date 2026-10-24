import { createGuest, createUser, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";
import { eq, ne } from "drizzle-orm";

import { make } from "@/core/registry";
import {
  getDatabase,
  problemsSchema,
  submissionsSchema,
  weeklyChallengesSchema,
} from "@/db";
import { ProblemsService } from "@/modules/problems";

import { buildReference, start } from "../submissions/helpers";

interface Weekly {
  weekStart: string;
  endsAt: string;
  problem: { slug: string; title: string };
  participants: number;
  entries: Array<{
    position: number;
    handle: string;
    score: number;
    mine: boolean;
  }>;
  me: { score: number | null; attempts: number; position: number | null };
}

const PATH = "/api/challenges/weekly";

const challenge = (user: TestUser) =>
  user.get<{ challenge: Weekly | null }>(PATH);

const weekly = async (user: TestUser) =>
  (await challenge(user)).body.challenge!;

const solve = async (user: TestUser) => {
  const attempt = await start(user);
  const revision = await buildReference(user, attempt);

  await user.post("/api/problems/url-shortener/submissions", { revision });
};

const rows = () => getDatabase().select().from(weeklyChallengesSchema);

describe("without an official problem", () => {
  test("there is no challenge", async () => {
    const user = await createUser();

    await getDatabase().delete(problemsSchema);

    expect((await challenge(user)).body).toEqual({ challenge: null });
    expect(await rows()).toHaveLength(0);
  });
});

describe("the weekly challenge", () => {
  beforeEach(async () => {
    await make(ProblemsService).syncOfficial();
    await getDatabase()
      .delete(problemsSchema)
      .where(ne(problemsSchema.slug, "url-shortener"));
  });

  test("needs a signed-in reader", async () => {
    expect((await createGuest().get(PATH)).status).toBe(401);
  });

  test("is one problem for everyone, picked once for the week", async () => {
    const ada = await createUser();
    const alan = await createUser();
    const first = await weekly(ada);
    const second = await weekly(alan);

    expect(first.problem.slug).toBe("url-shortener");
    expect(second.problem.slug).toBe(first.problem.slug);
    expect(first.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(first.endsAt).getTime()).toBeGreaterThan(Date.now());
    expect(await rows()).toHaveLength(1);
  });

  test("starts with nobody on it", async () => {
    const user = await createUser();
    const body = await weekly(user);

    expect(body.participants).toBe(0);
    expect(body.entries).toEqual([]);
    expect(body.me).toEqual({ score: null, attempts: 0, position: null });
  });

  test("lists this week's best scores and the caller's own place", async () => {
    const ada = await createUser();
    const alan = await createUser();

    await solve(ada);

    const asAda = await weekly(ada);
    const asAlan = await weekly(alan);

    expect(asAda.participants).toBe(1);
    expect(asAda.entries).toHaveLength(1);
    expect(asAda.entries[0]!.position).toBe(1);
    expect(asAda.me.score).toBe(asAda.entries[0]!.score);
    expect(asAda.me.attempts).toBe(1);
    expect(asAda.me.position).toBe(1);
    expect(asAda.entries[0]!.mine).toBe(true);
    expect(asAlan.entries.map((entry) => entry.mine)).toEqual([false]);
    expect(asAlan.me).toEqual({ score: null, attempts: 0, position: null });
  });

  test("counts a hidden profile as a participant without listing it", async () => {
    const ada = await createUser();

    await ada.patch("/api/profiles/me", { visible: false });
    await solve(ada);

    const body = await weekly(ada);

    expect(body.participants).toBe(1);
    expect(body.entries).toEqual([]);
    expect(body.me.score).not.toBeNull();
    expect(body.me.position).toBeNull();
  });

  test("ignores what was submitted in an earlier week", async () => {
    const ada = await createUser();

    await solve(ada);
    await getDatabase()
      .update(submissionsSchema)
      .set({ createdAt: new Date(Date.now() - 15 * 24 * 3_600_000) })
      .where(eq(submissionsSchema.userId, ada.id));

    const body = await weekly(ada);

    expect(body.participants).toBe(0);
    expect(body.me.score).toBeNull();
  });

  test("ignores a submission that does not count", async () => {
    const ada = await createUser();

    await solve(ada);
    await getDatabase()
      .update(submissionsSchema)
      .set({ counted: false })
      .where(eq(submissionsSchema.userId, ada.id));

    expect((await weekly(ada)).participants).toBe(0);
  });
});
