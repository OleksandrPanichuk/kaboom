import { getEnv } from "@/configs";
import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { EmailPreferencesService } from "@/modules/email-preferences";
import { NotificationsService } from "@/modules/notifications";
import { type ProblemEntity, ProblemsRepository } from "@/modules/problems";
import { UserEntity, UsersService } from "@/modules/users";

import { SendCommentDigestJob } from "./jobs";
import { CommentDigestsRepository, ProblemCommentsRepository } from "./ports";
import type { ProblemCommentEntity } from "./problem-comment.entity";
import {
  COMMENT_DIGEST_DELAY_MS,
  COMMENT_DIGEST_EXCERPT_LENGTH,
} from "./problem-comments.constants";

export interface SendCommentDigestOptions {
  userId: string;
  problemId: string;
  since: Date;
}

const excerpt = (body: string): string => {
  const flat = body.replace(/\s+/g, " ").trim();

  return flat.length <= COMMENT_DIGEST_EXCERPT_LENGTH
    ? flat
    : `${flat.slice(0, COMMENT_DIGEST_EXCERPT_LENGTH - 1).trimEnd()}…`;
};

export class CommentDigestsService extends Service {
  private readonly comments = makeRepository(ProblemCommentsRepository);

  private readonly digests = makeRepository(CommentDigestsRepository);

  private readonly problems = makeRepository(ProblemsRepository);

  private readonly users = makeService(UsersService);

  private readonly preferences = makeService(EmailPreferencesService);

  private readonly notifications = makeService(NotificationsService);

  private readonly sendDigest = make(SendCommentDigestJob);

  public async schedule(
    problem: ProblemEntity,
    comment: ProblemCommentEntity,
    threadId: string | null,
  ): Promise<void> {
    const participants =
      threadId === null ? [] : await this.comments.participants(threadId);
    const recipients = new Set(
      [problem.authorId, ...participants].filter(
        (id): id is string => id !== null && id !== comment.authorId,
      ),
    );
    const since = new Date(comment.createdAt.getTime() - 1).toISOString();

    for (const userId of recipients) {
      await this.sendDigest.dispatch(
        { userId, problemId: problem.id, since },
        {
          jobId: `comment-digest.${userId}.${problem.id}`,
          delayMs: COMMENT_DIGEST_DELAY_MS,
        },
      );
    }
  }

  public async send({
    userId,
    problemId,
    since,
  }: SendCommentDigestOptions): Promise<void> {
    const [user, found] = await Promise.all([
      this.users.findById(userId),
      this.problems.findById(problemId),
    ]);

    if (!user || !found || !UserEntity.isEmailVerified(user)) return;
    if (!(await this.preferences.wants(userId, "comments"))) return;

    const { problem } = found;
    const asAuthor = problem.authorId === userId;
    const comments = await this.comments.listForDigest({
      problemId,
      userId,
      everything: asAuthor,
      after: (await this.digests.sentUpTo(userId, problemId)) ?? since,
    });
    const [first] = comments;
    const last = comments.at(-1);

    if (!first || !last) return;

    await this.notifications.sendCommentDigest({
      userId: user.id,
      email: user.email,
      name: user.name,
      problemTitle: problem.title,
      problemUrl: new URL(
        `/problems/${problem.slug}`,
        getEnv().APP_URL,
      ).toString(),
      count: comments.length,
      asAuthor,
      first: {
        author: first.author?.displayName ?? "A solver",
        excerpt: excerpt(first.body),
        spoiler: first.spoiler,
      },
    });
    await this.digests.markSent(userId, problemId, last.createdAt);
  }
}
