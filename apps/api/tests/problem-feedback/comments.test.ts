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

const PATH = "/api/problems/url-shortener/comments";

interface Comment {
  id: string;
  parentId: string | null;
  body: string;
  spoiler: boolean;
  author: { handle: string; displayName: string } | null;
  byProblemAuthor: boolean;
  mine: boolean;
  editedAt: string | null;
  removed: "author" | "moderator" | null;
}

interface Thread extends Comment {
  replies: Comment[];
}

interface Threads {
  items: Thread[];
  nextCursor: string | null;
}

interface ErrorBody {
  code: string;
}

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

const post = (user: TestUser, body: Record<string, unknown>, path = PATH) =>
  user.post<Comment & ErrorBody>(path, body);

const threads = async (user: TestUser, query = "", path = PATH) =>
  (await user.get<Threads>(`${path}${query}`)).body;

describe("problem comments", () => {
  test("a verified solver comments and others answer in one conversation", async () => {
    const ada = await createVerifiedUser();
    const grace = await createVerifiedUser();

    const first = await post(ada, { body: "  Does the cache need TTLs?  " });

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      parentId: null,
      body: "Does the cache need TTLs?",
      spoiler: false,
      mine: true,
      byProblemAuthor: false,
      removed: null,
    });

    const reply = await post(grace, {
      body: "Short ones, yes.",
      parentId: first.body.id,
      spoiler: true,
    });
    const nested = await post(ada, {
      body: "Thanks!",
      parentId: reply.body.id,
    });

    expect(nested.body.parentId).toBe(first.body.id);

    const seen = await threads(grace);

    expect(seen.items).toHaveLength(1);
    expect(seen.items[0]).toMatchObject({ id: first.body.id, mine: false });
    expect(seen.items[0]!.replies.map((comment) => comment.body)).toEqual([
      "Short ones, yes.",
      "Thanks!",
    ]);
    expect(seen.items[0]!.replies[0]).toMatchObject({
      spoiler: true,
      mine: true,
    });
  });

  test("needs a verified email, a published problem and a real body", async () => {
    const unverified = await createUser();
    const ada = await createVerifiedUser();

    expect((await post(unverified, { body: "Hi" })).body.code).toBe(
      "EMAIL_NOT_VERIFIED",
    );
    expect(
      (await post(ada, { body: "Hi" }, "/api/problems/no-such/comments"))
        .status,
    ).toBe(404);
    expect((await post(ada, { body: "   " })).status).toBe(422);
    expect((await createGuest().get(PATH)).status).toBe(401);
  });

  test("only its writer edits a comment, which is then marked as edited", async () => {
    const ada = await createVerifiedUser();
    const grace = await createVerifiedUser();
    const { body } = await post(ada, { body: "Frist" });
    const path = `${PATH}/${body.id}`;

    const refused = await grace.patch<ErrorBody>(path, { body: "Mine now" });

    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe("COMMENT_NOT_YOURS");

    const edited = await ada.patch<Comment>(path, {
      body: "First",
      spoiler: true,
    });

    expect(edited.body).toMatchObject({ body: "First", spoiler: true });
    expect(edited.body.editedAt).not.toBeNull();
  });

  test("a removed comment stays, empty, only while it has replies", async () => {
    const ada = await createVerifiedUser();
    const grace = await createVerifiedUser();
    const answered = await post(ada, { body: "Answered" });
    const alone = await post(ada, { body: "Alone" });

    await post(grace, { body: "An answer", parentId: answered.body.id });
    await ada.delete(`${PATH}/${answered.body.id}`);
    await ada.delete(`${PATH}/${alone.body.id}`);

    const seen = await threads(grace);

    expect(seen.items).toHaveLength(1);
    expect(seen.items[0]).toMatchObject({
      id: answered.body.id,
      body: "",
      author: null,
      removed: "author",
    });
    expect(seen.items[0]!.replies).toHaveLength(1);

    const late = await post(grace, {
      body: "Another",
      parentId: answered.body.id,
    });

    expect(late.status).toBe(409);
    expect(late.body.code).toBe("COMMENT_REMOVED");
  });

  test("a moderator removes anyone's comment, and nobody else may", async () => {
    const ada = await createVerifiedUser();
    const grace = await createVerifiedUser();
    const moderator = await createModerator();
    const { body } = await post(ada, { body: "Spam" });
    const path = `${PATH}/${body.id}`;

    await post(grace, { body: "Reported", parentId: body.id });

    const refused = await grace.delete<ErrorBody>(path);

    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe("COMMENT_NOT_YOURS");
    expect((await moderator.delete(path)).status).toBe(200);
    expect((await threads(grace)).items[0]).toMatchObject({
      body: "",
      removed: "moderator",
    });
  });

  test("a comment is only reached through its own problem", async () => {
    const ada = await createVerifiedUser();
    const { body } = await post(ada, { body: "On the shortener" });
    const elsewhere = `/api/problems/chat/comments/${body.id}`;

    expect((await ada.patch(elsewhere, { body: "Moved" })).status).toBe(404);
    expect(
      (
        await post(
          ada,
          { body: "Cross", parentId: body.id },
          "/api/problems/chat/comments",
        )
      ).status,
    ).toBe(404);
  });

  test("pages through conversations, newest first", async () => {
    const ada = await createVerifiedUser();

    for (const text of ["one", "two", "three"]) {
      await post(ada, { body: text });
    }

    const first = await threads(ada, "?limit=2");
    const second = await threads(ada, `?limit=2&cursor=${first.nextCursor}`);

    expect(first.items.map((thread) => thread.body)).toEqual(["three", "two"]);
    expect(second.items.map((thread) => thread.body)).toEqual(["one"]);
    expect(second.nextCursor).toBeNull();
  });

  test("names a community problem's author and hides a hidden profile", async () => {
    const author = await createVerifiedUser();
    const moderator = await createModerator();
    const slug = await publishFork(author, moderator, "Shortener, again");
    const path = `/api/problems/${slug}/comments`;
    const solver = await createVerifiedUser();

    await solver.patch("/api/profiles/me", { visible: false });

    const question = await post(solver, { body: "Why 1M?" }, path);

    await post(
      author,
      { body: "Launch day.", parentId: question.body.id },
      path,
    );

    const [thread] = (await threads(solver, "", path)).items;

    expect(thread).toMatchObject({ author: null, byProblemAuthor: false });
    expect(thread!.replies[0]).toMatchObject({ byProblemAuthor: true });
    expect(thread!.replies[0]!.author).not.toBeNull();
  });

  test("counts standing comments on the problem", async () => {
    const ada = await createVerifiedUser();
    const kept = await post(ada, { body: "Kept" });
    const gone = await post(ada, { body: "Gone" });

    await post(ada, { body: "Reply", parentId: kept.body.id });
    await ada.delete(`${PATH}/${gone.body.id}`);

    const problem = await ada.get<{ commentCount: number }>(
      "/api/problems/url-shortener",
    );

    expect(problem.body.commentCount).toBe(2);
  });
});
