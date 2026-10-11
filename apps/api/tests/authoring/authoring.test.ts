import { createUser, createVerifiedUser, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make, makeRepository, makeService } from "@/core/registry";
import type { UserRole } from "@/db";
import { ProblemDraftsRepository } from "@/modules/authoring";
import { ProblemsService } from "@/modules/problems";
import { UsersService } from "@/modules/users";

import { applyOps, type DesignBody } from "../designs/helpers";
import { buildReference, start } from "../submissions/helpers";

interface Issue {
  path: Array<string | number>;
  message: string;
}

interface Draft {
  id: string;
  content: Record<string, unknown>;
  status: string;
  problem: { slug: string; currentVersion: number } | null;
  forkedFrom: { slug: string } | null;
  designs: { baseline: string | null; reference: string | null };
  issues: Issue[];
  reviews: Array<{ id: string; status: string; feedback: string | null }>;
  code?: string;
  details?: { issues: Issue[] };
}

interface Review {
  id: string;
  status: string;
  slug: string;
  update: boolean;
  author: { handle: string } | null;
  currentContent?: unknown;
  code?: string;
}

const verified = async (role: UserRole = "user"): Promise<TestUser> => {
  const user = await createVerifiedUser();

  if (role !== "user") await makeService(UsersService).setRole(user.id, role);

  return user;
};

const create = (user: TestUser, forkOf?: string) =>
  user.post<Draft>("/api/problem-drafts", forkOf ? { forkOf } : {});

const save = (user: TestUser, id: string, content: unknown) =>
  user.put<Draft>(`/api/problem-drafts/${id}`, { content });

const submit = (user: TestUser, id: string) =>
  user.post<Draft>(`/api/problem-drafts/${id}/submit`, {});

const pending = async (moderator: TestUser) =>
  (await moderator.get<{ items: Review[] }>("/api/problem-reviews")).body.items;

const approve = (moderator: TestUser, id: string, difficulty?: string) =>
  moderator.post<Review>(
    `/api/problem-reviews/${id}/approve`,
    difficulty ? { difficulty } : {},
  );

const fork = async (author: TestUser) => {
  const draft = (await create(author, "url-shortener")).body;
  const slug = `community-shortener-${Math.random().toString(36).slice(2, 8)}`;

  return (await save(author, draft.id, { ...draft.content, slug })).body;
};

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

describe("a problem draft", () => {
  test("starts blank for a verified author, and parses as they write", async () => {
    const author = await verified();
    const created = await create(author);

    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({
      status: "draft",
      problem: null,
      issues: [],
    });

    const broken = await save(author, created.body.id, {
      ...created.body.content,
      title: "x",
      drills: [],
    });

    expect(broken.status).toBe(200);
    expect(broken.body.content.title).toBe("x");
    expect(broken.body.issues.map((issue) => issue.path)).toEqual([
      ["title"],
      ["drills"],
    ]);
  });

  test("needs a verified email to start, and stays its author's", async () => {
    const unverified = await createUser();
    const author = await verified();
    const other = await verified();
    const draft = (await create(author)).body;

    expect((await create(unverified)).status).toBe(403);
    expect((await other.get(`/api/problem-drafts/${draft.id}`)).status).toBe(
      404,
    );
    expect((await save(other, draft.id, {})).status).toBe(404);
  });

  test("is checked in full, and refused for review with its issues", async () => {
    const author = await verified();
    const draft = (await create(author)).body;
    const checked = await author.post<{ ok: boolean; issues: Issue[] }>(
      `/api/problem-drafts/${draft.id}/check`,
      {},
    );
    const refused = await submit(author, draft.id);

    expect(checked.body.ok).toBe(false);
    expect(checked.body.issues[0]?.path).toEqual(["reference", "graph"]);
    expect(refused.status).toBe(422);
    expect(refused.body.code).toBe("PROBLEM_NOT_PUBLISHABLE");
    expect(refused.body.details?.issues).toEqual(checked.body.issues);
  });

  test("keeps to twenty per author", async () => {
    const author = await verified();

    for (let index = 0; index < 20; index++) {
      await makeRepository(ProblemDraftsRepository).create({
        authorId: author.id,
        content: {},
        forkedFromId: null,
      });
    }

    const over = await create(author);

    expect(over.status).toBe(409);
    expect(over.body.code).toBe("DRAFT_LIMIT");
  });
});

describe("a community problem", () => {
  test("is forked, reviewed, published at the moderator's difficulty, and credits its source", async () => {
    const author = await verified();
    const moderator = await verified("moderator");
    const draft = await fork(author);
    const slug = draft.content.slug as string;

    expect(draft.forkedFrom).toMatchObject({ slug: "url-shortener" });

    const sent = await submit(author, draft.id);

    expect(sent.body.status).toBe("in-review");
    expect((await submit(author, draft.id)).body.code).toBe("REVIEW_PENDING");
    expect((await author.get(`/api/problems/${slug}`)).status).toBe(404);

    const [review] = await pending(moderator);

    expect(review).toMatchObject({ slug, update: false });
    expect(review!.author?.handle).toBeString();

    const approved = await approve(moderator, review!.id, "hard");

    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe("approved");

    const published = await author.get<{
      difficulty: string;
      source: string;
      author: { handle: string } | null;
      forkedFrom: { slug: string } | null;
    }>(`/api/problems/${slug}`);
    const official = await author.get<{ author: unknown; forkedFrom: unknown }>(
      "/api/problems/url-shortener",
    );

    expect(published.body).toMatchObject({
      source: "community",
      forkedFrom: { slug: "url-shortener" },
    });
    expect(published.body.author?.handle).toBe(review!.author?.handle);
    expect(official.body).toMatchObject({ author: null, forkedFrom: null });
    const after = (await author.get<Draft>(`/api/problem-drafts/${draft.id}`))
      .body;

    expect(published.status).toBe(200);
    expect(published.body.difficulty).toBe("hard");
    expect(after).toMatchObject({
      status: "published",
      problem: { slug, currentVersion: 1 },
    });
    expect(await pending(moderator)).toEqual([]);
  });

  test("changes only through another review, which can send it back", async () => {
    const author = await verified();
    const moderator = await verified("moderator");
    const draft = await fork(author);
    const slug = draft.content.slug as string;

    await submit(author, draft.id);
    await approve(moderator, (await pending(moderator))[0]!.id);

    expect((await submit(author, draft.id)).body.code).toBe(
      "NOTHING_TO_REVIEW",
    );
    expect(
      (
        await save(author, draft.id, {
          ...draft.content,
          slug: `${slug}-moved`,
        })
      ).status,
    ).toBe(200);
    expect((await submit(author, draft.id)).body.code).toBe("SLUG_CHANGED");

    await save(author, draft.id, { ...draft.content, title: "Shorter links" });
    await submit(author, draft.id);

    const [update] = await pending(moderator);
    const opened = await moderator.get<Review>(
      `/api/problem-reviews/${update!.id}`,
    );

    expect(update!.update).toBe(true);
    expect(opened.body.currentContent).toMatchObject({ slug });

    const rejected = await moderator.post<Review>(
      `/api/problem-reviews/${update!.id}/reject`,
      { feedback: "Say what changed in the statement too." },
    );
    const sentBack = (
      await author.get<Draft>(`/api/problem-drafts/${draft.id}`)
    ).body;

    expect(rejected.body.status).toBe("rejected");
    expect(sentBack.status).toBe("changes-requested");
    expect(sentBack.reviews[0]!.feedback).toBe(
      "Say what changed in the statement too.",
    );

    await submit(author, draft.id);
    await approve(moderator, (await pending(moderator))[0]!.id);

    const live = await author.get<{ title: string; version: number }>(
      `/api/problems/${slug}`,
    );

    expect(live.body.title).toBe("Shorter links");
  });

  test("needs a slug nobody uses, and can be taken back while it waits", async () => {
    const author = await verified();
    const draft = await fork(author);

    await save(author, draft.id, { ...draft.content, slug: "url-shortener" });
    expect((await submit(author, draft.id)).body.code).toBe("SLUG_TAKEN");

    await save(author, draft.id, draft.content);
    await submit(author, draft.id);

    const withdrawn = await author.post<Draft>(
      `/api/problem-drafts/${draft.id}/withdraw`,
      {},
    );

    expect(withdrawn.body.status).toBe("draft");
    expect(withdrawn.body.reviews[0]!.status).toBe("withdrawn");
  });

  test("is reviewed only by a moderator who did not write it", async () => {
    const author = await verified("moderator");
    const moderator = await verified("moderator");
    const user = await verified();
    const draft = await fork(author);

    await submit(author, draft.id);

    const [review] = await pending(moderator);
    const own = await approve(author, review!.id);

    expect(own.status).toBe(403);
    expect(own.body.code).toBe("OWN_PROBLEM_REVIEW");
    expect((await approve(user, review!.id)).status).toBe(403);
    expect((await user.get("/api/problem-reviews")).status).toBe(403);
    expect((await user.get(`/api/problem-reviews/${review!.id}`)).status).toBe(
      404,
    );
    expect(
      (await author.get<Review>(`/api/problem-reviews/${review!.id}`)).body
        .slug,
    ).toBe(draft.content.slug as string);
  });
});

describe("points on a community problem", () => {
  interface Board {
    me: { points: number; solved: number };
  }

  const solve = async (user: TestUser, slug: string) => {
    const attempt = await start(user, slug);
    const revision = await buildReference(user, attempt);

    return user.post<{ score: number }>(`/api/problems/${slug}/submissions`, {
      revision,
    });
  };

  const points = async (user: TestUser) =>
    (await user.get<Board>("/api/leaderboard")).body.me.points;

  test("count for solvers, never for the author, and follow the moderator's difficulty", async () => {
    const author = await verified();
    const moderator = await verified("moderator");
    const solver = await verified();
    const draft = await fork(author);
    const slug = draft.content.slug as string;

    await submit(author, draft.id);
    await approve(moderator, (await pending(moderator))[0]!.id, "easy");

    expect((await solve(solver, slug)).body.score).toBe(100);
    expect((await solve(author, slug)).body.score).toBe(100);
    expect(await points(solver)).toBe(100);
    expect(await points(author)).toBe(0);

    await save(author, draft.id, { ...draft.content, title: "Harder links" });
    await submit(author, draft.id);
    await approve(moderator, (await pending(moderator))[0]!.id, "hard");

    expect(await points(solver)).toBe(300);
    expect(
      (
        await solver.get<{ problems: Array<{ slug: string }> }>("/api/progress")
      ).body.problems.map((problem) => problem.slug),
    ).toContain(slug);
    expect(
      (
        await author.get<{ problems: Array<{ slug: string }> }>("/api/progress")
      ).body.problems.map((problem) => problem.slug),
    ).not.toContain(slug);
  });
});

describe("a draft's designs", () => {
  test("are opened once from the draft's graphs, then are what the draft reads", async () => {
    const author = await verified();
    const draft = await fork(author);
    const opened = await author.post<{ designId: string }>(
      `/api/problem-drafts/${draft.id}/designs/reference`,
      {},
    );
    const again = await author.post<{ designId: string }>(
      `/api/problem-drafts/${draft.id}/designs/reference`,
      {},
    );

    expect(opened.status).toBe(200);
    expect(again.body.designId).toBe(opened.body.designId);

    const design = await author.get<DesignBody>(
      `/api/designs/${opened.body.designId}`,
    );
    const reference = (
      draft.content.reference as { graph: DesignBody["graph"] }
    ).graph;

    expect(design.body.graph.nodes.map((node) => node.id).sort()).toEqual(
      reference.nodes.map((node) => node.id).sort(),
    );

    const cache = reference.nodes.find((node) => node.kind === "cache")!;

    await applyOps(author, opened.body.designId, design.body.revision, [
      { op: "remove-node", id: cache.id },
    ]);

    const read = (await author.get<Draft>(`/api/problem-drafts/${draft.id}`))
      .body;
    const graph = (read.content.reference as { graph: DesignBody["graph"] })
      .graph;
    const checked = await author.post<{ ok: boolean; issues: Issue[] }>(
      `/api/problem-drafts/${draft.id}/check`,
      {},
    );

    expect(read.designs).toEqual({
      baseline: null,
      reference: opened.body.designId,
    });
    expect(graph.nodes.some((node) => node.id === cache.id)).toBe(false);
    expect(checked.body.ok).toBe(false);
    expect(checked.body.issues[0]!.path).toEqual(["reference", "graph"]);

    const saved = await save(author, draft.id, draft.content);

    expect(
      (saved.body.content.reference as { graph: DesignBody["graph"] }).graph
        .nodes.length,
    ).toBe(graph.nodes.length);
  });

  test("belong to the draft's author", async () => {
    const author = await verified();
    const other = await verified();
    const draft = await fork(author);

    expect(
      (await other.post(`/api/problem-drafts/${draft.id}/designs/baseline`, {}))
        .status,
    ).toBe(404);
  });
});
