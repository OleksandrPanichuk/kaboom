import {
  createGuest,
  createUser,
  createVerifiedUser,
  type TestUser,
} from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make } from "@/core/registry";
import { ProblemsService } from "@/modules/problems";

import { createModerator, publishFork } from "../authoring/helpers";
import { buildReference, start } from "../submissions/helpers";

interface MyProfile {
  handle: string;
  displayName: string;
  bio: string;
  links: string[];
  avatarUrl: string | null;
  visible: boolean;
  code?: string;
}

interface PublicProfile extends MyProfile {
  joinedAt: string;
  own: boolean;
  standing: {
    points: number;
    solved: number;
    rank: string;
    position: number | null;
  };
  skills: Array<{ skill: string; score: number | null; samples: number }>;
  recent: Array<{ problem: { slug: string; title: string }; score: number }>;
  problems: Array<{ slug: string; title: string; solvers: number }>;
}

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

const mine = (user: TestUser) => user.get<MyProfile>("/api/profiles/me");

const update = (user: TestUser, patch: Record<string, unknown>) =>
  user.patch<MyProfile>("/api/profiles/me", patch);

const profileOf = (viewer: TestUser, handle: string) =>
  viewer.get<PublicProfile & { code?: string }>(`/api/profiles/${handle}`);

const upload = (user: TestUser, bytes: Uint8Array, name = "me.png") => {
  const form = new FormData();

  form.append("file", new File([bytes], name, { type: "image/png" }));

  return user.put<MyProfile>("/api/profiles/me/avatar", form);
};

const solveShortener = async (user: TestUser) => {
  const attempt = await start(user);
  const revision = await buildReference(user, attempt);

  await user.post("/api/problems/url-shortener/submissions", { revision });
};

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("a profile", () => {
  test("is made at sign-up, public, with a handle and display name from the name", async () => {
    const ada = await createUser({ name: "Ada Lovelace" });
    const response = await mine(ada);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      displayName: "Ada Lovelace",
      bio: "",
      links: [],
      avatarUrl: null,
      visible: true,
    });
    expect(response.body.handle).toMatch(/^ada-lovelac-[0-9a-f]{8}$/);
  });

  test("changes its display name without touching the account's name", async () => {
    const ada = await createUser({ name: "Ada Lovelace" });
    const saved = await update(ada, {
      handle: "ada",
      displayName: "  The Countess ",
      bio: "Notes on the engine.",
      links: ["https://example.com/ada"],
    });

    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      handle: "ada",
      displayName: "The Countess",
      bio: "Notes on the engine.",
      links: ["https://example.com/ada"],
    });
    expect((await ada.get<{ name: string }>("/api/users/me")).body.name).toBe(
      "Ada Lovelace",
    );
  });

  test("keeps a handle to one person, and refuses what breaks the rules", async () => {
    const ada = await createUser();
    const grace = await createUser();

    expect((await update(ada, { handle: "ada" })).status).toBe(200);

    const taken = await update(grace, { handle: "ada" });

    expect(taken.status).toBe(409);
    expect(taken.body.code).toBe("HANDLE_TAKEN");

    for (const patch of [
      { handle: "A" },
      { handle: "-grace" },
      { displayName: "   " },
      { links: ["javascript:alert(1)"] },
      {
        links: ["https://a.io", "https://b.io", "https://c.io", "https://d.io"],
      },
      { bio: "x".repeat(281) },
    ]) {
      expect((await update(grace, patch)).status).toBe(422);
    }
  });

  test("shows others the standing, skills and counted submissions, never the email or account name", async () => {
    const ada = await createUser({ name: "Ada Lovelace" });
    const grace = await createUser();

    await solveShortener(ada);
    await update(ada, { handle: "ada", displayName: "Countess" });

    const response = await profileOf(grace, "ADA");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      handle: "ada",
      displayName: "Countess",
      own: false,
      standing: { points: 100, solved: 1, rank: "Middle", position: 1 },
      recent: [{ problem: { slug: "url-shortener" }, score: 100 }],
    });
    expect(response.body.skills.length).toBeGreaterThan(0);
    expect(JSON.stringify(response.body)).not.toContain(ada.email);
    expect(JSON.stringify(response.body)).not.toContain("Ada Lovelace");
  });

  test("once hidden, is gone for others and off the leaderboard, but still the owner's", async () => {
    const ada = await createUser();
    const grace = await createUser();

    await solveShortener(ada);
    await update(ada, { handle: "ada", visible: false });

    const seen = await profileOf(grace, "ada");

    expect(seen.status).toBe(404);
    expect(seen.body.code).toBe("PROFILE_NOT_FOUND");
    expect((await profileOf(ada, "ada")).body).toMatchObject({
      own: true,
      visible: false,
      standing: { points: 100, position: null },
    });
    expect(
      (await grace.get<{ entries: unknown[] }>("/api/leaderboard")).body
        .entries,
    ).toEqual([]);
  });

  test("lists the problems its owner published, with how many others solved each", async () => {
    const author = await createVerifiedUser();
    const moderator = await createModerator();
    const solver = await createUser();
    const first = await publishFork(author, moderator, "Short links");
    const second = await publishFork(author, moderator, "Shorter links");
    const solve = async (user: TestUser, slug: string) => {
      const attempt = await start(user, slug);
      const revision = await buildReference(user, attempt);

      await user.post(`/api/problems/${slug}/submissions`, { revision });
    };

    await solve(solver, first);
    await solve(author, first);
    await update(author, { handle: "author" });

    const { problems } = (await profileOf(solver, "author")).body;

    expect(
      problems
        .map(({ slug, solvers }) => ({ slug, solvers }))
        .sort((a, b) => b.solvers - a.solvers),
    ).toEqual([
      { slug: first, solvers: 1 },
      { slug: second, solvers: 0 },
    ]);
    expect((await profileOf(author, "author")).body.problems).toHaveLength(2);
    const { handle } = (await mine(solver)).body;

    expect((await profileOf(author, handle)).body.problems).toEqual([]);
  });

  test("needs a session, except for an avatar image", async () => {
    const guest = createGuest();

    expect((await guest.get("/api/profiles/me")).status).toBe(401);
    expect((await guest.get("/api/profiles/someone")).status).toBe(401);
  });
});

describe("an avatar", () => {
  test("is stored, served to anyone and cached for good, and replaced by the next", async () => {
    const ada = await createUser();
    const first = await upload(ada, PNG);

    expect(first.status).toBe(200);
    expect(first.body.avatarUrl).toMatch(
      /^\/api\/profiles\/avatars\/[0-9a-f-]{36}\.png$/,
    );

    const served = await createGuest().get(first.body.avatarUrl!);

    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(served.headers.get("cache-control")).toContain("immutable");

    const second = await upload(ada, PNG);

    expect(second.body.avatarUrl).not.toBe(first.body.avatarUrl);
    expect((await createGuest().get(first.body.avatarUrl!)).status).toBe(404);
    expect((await mine(ada)).body.avatarUrl).toBe(second.body.avatarUrl);
  });

  test("must be an image by its bytes, and small", async () => {
    const ada = await createUser();
    const text = await upload(ada, new TextEncoder().encode("not an image"));

    expect(text.status).toBe(422);
    expect(text.body.code).toBe("AVATAR_INVALID");

    const large = new Uint8Array(1024 * 1024 + 1);

    large.set(PNG);
    expect((await upload(ada, large)).status).toBe(422);
    expect((await mine(ada)).body.avatarUrl).toBeNull();
  });

  test("can be removed", async () => {
    const ada = await createUser();
    const { body } = await upload(ada, PNG);
    const removed = await ada.delete<MyProfile>("/api/profiles/me/avatar");

    expect(removed.status).toBe(200);
    expect(removed.body.avatarUrl).toBeNull();
    expect((await createGuest().get(body.avatarUrl!)).status).toBe(404);
  });
});

describe("deleting the account", () => {
  test("removes the avatar with the profile", async () => {
    const ada = await createUser();
    const { body } = await upload(ada, PNG);
    const deleted = await ada.delete("/api/users/me", {
      email: ada.email,
      password: ada.password,
    });

    expect(deleted.status).toBeLessThan(300);
    expect((await createGuest().get(body.avatarUrl!)).status).toBe(404);
  });
});
