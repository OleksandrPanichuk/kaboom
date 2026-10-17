import { createVerifiedUser, inbox, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make, makeService } from "@/core/registry";
import { CommentDigestsService } from "@/modules/problem-comments";
import { ProblemsRepository, ProblemsService } from "@/modules/problems";

import { createModerator, publishFork } from "../authoring/helpers";

interface Comment {
  id: string;
}

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

const commentOn = (
  slug: string,
  user: TestUser,
  body: string,
  extra: Record<string, unknown> = {},
) => user.post<Comment>(`/api/problems/${slug}/comments`, { body, ...extra });

const commentEmails = (user: TestUser) =>
  inbox
    .for(user.email)
    .filter((message) => /new (comment|repl)/.test(message.subject));

const communityProblem = async () => {
  const author = await createVerifiedUser({ name: "Grace Hopper" });
  const slug = await publishFork(author, await createModerator(), "Tiny links");

  return { author, slug };
};

describe("comment emails", () => {
  test("tell a problem's author about a comment, never about their own", async () => {
    const { author, slug } = await communityProblem();
    const solver = await createVerifiedUser({ name: "Ada Lovelace" });

    await commentOn(slug, author, "Ask me anything.");

    expect(commentEmails(author)).toHaveLength(0);

    await commentOn(slug, solver, "Why one million links a day?");

    const [email] = commentEmails(author);

    expect(email?.subject).toBe("1 new comment on Tiny links");
    expect(email?.text).toContain("Why one million links a day?");
    expect(email?.text).toContain(`/problems/${slug}`);
    expect(commentEmails(solver)).toHaveLength(0);
  });

  test("tell everyone in a conversation about a reply, but not the one replying", async () => {
    const ada = await createVerifiedUser();
    const grace = await createVerifiedUser();
    const linus = await createVerifiedUser();
    const slug = "url-shortener";
    const question = await commentOn(slug, ada, "Is a cache enough?");

    expect(commentEmails(ada)).toHaveLength(0);

    await commentOn(slug, grace, "Mostly.", { parentId: question.body.id });
    await commentOn(slug, linus, "Add a CDN too.", {
      parentId: question.body.id,
    });

    expect(commentEmails(ada).map((email) => email.subject)).toEqual([
      "1 new reply to your comment on URL shortener",
      "1 new reply to your comment on URL shortener",
    ]);
    expect(commentEmails(grace)).toHaveLength(1);
    expect(commentEmails(linus)).toHaveLength(0);
  });

  test("keeps a spoiler out of the email", async () => {
    const { author, slug } = await communityProblem();
    const solver = await createVerifiedUser({ name: "Ada Lovelace" });

    await commentOn(slug, solver, "Use base62 ids", { spoiler: true });

    const [email] = commentEmails(author);

    expect(email?.text).toContain("marked as a spoiler");
    expect(email?.text).not.toContain("base62");
  });

  test("is not sent once turned off, and is on by default", async () => {
    const { author, slug } = await communityProblem();
    const solver = await createVerifiedUser();

    expect(
      (await author.get<{ comments: boolean }>("/api/email-preferences/me"))
        .body,
    ).toEqual({ comments: true });

    const off = await author.patch<{ comments: boolean }>(
      "/api/email-preferences/me",
      { comments: false },
    );

    expect(off.body).toEqual({ comments: false });

    await commentOn(slug, solver, "Hello?");

    expect(commentEmails(author)).toHaveLength(0);
  });

  test("a digest sends each comment once, however often it runs", async () => {
    const { author, slug } = await communityProblem();
    const solver = await createVerifiedUser();

    await commentOn(slug, solver, "First");

    const problem = await make(ProblemsRepository).findBySlug(slug);

    await makeService(CommentDigestsService).send({
      userId: author.id,
      problemId: problem!.id,
      since: new Date(0),
    });

    expect(commentEmails(author)).toHaveLength(1);
  });
});
