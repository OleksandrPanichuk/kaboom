import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import { CommentDigestsService } from "../comment-digests.service";
import { ProblemCommentsRepository } from "../ports";
import type {
  ListedComment,
  ProblemCommentEntity,
} from "../problem-comment.entity";
import { MAX_REPLIES } from "../problem-comments.constants";
import {
  CommentRemovedError,
  CommentThreadFullError,
} from "../problem-comments.errors";
import { ProblemCommentsService } from "../problem-comments.service";

export interface PostProblemCommentUseCaseOptions {
  authorId: string;
  slug: string;
  body: string;
  spoiler: boolean;
  parentId: string | null;
}

type Options = PostProblemCommentUseCaseOptions;

interface Result {
  problemAuthorId: string | null;
  comment: ListedComment;
}

export class PostProblemCommentUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly service = makeService(ProblemCommentsService);

  private readonly comments = makeRepository(ProblemCommentsRepository);

  private readonly digests = makeService(CommentDigestsService);

  public async execute({
    authorId,
    slug,
    body,
    spoiler,
    parentId,
  }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);
    const thread = await this.threadOf(parentId, problem.id);
    const posted = await this.comments.insert({
      problemId: problem.id,
      authorId,
      parentId: thread?.id ?? null,
      body: body.trim(),
      spoiler,
    });

    await this.digests.schedule(problem, posted, thread?.id ?? null);

    return {
      problemAuthorId: problem.authorId,
      comment: await this.service.getListed(posted.id),
    };
  }

  private async threadOf(
    parentId: string | null,
    problemId: string,
  ): Promise<ProblemCommentEntity | null> {
    if (parentId === null) return null;

    const parent = await this.service.getOnProblem(parentId, problemId);
    const threadId = parent.parentId ?? parent.id;
    const thread =
      threadId === parent.id
        ? parent
        : await this.service.getOnProblem(threadId, problemId);

    if (thread.removedAt !== null) {
      throw new CommentRemovedError("That conversation was removed");
    }

    if ((await this.comments.countReplies(threadId)) >= MAX_REPLIES) {
      throw new CommentThreadFullError(
        `A conversation holds at most ${MAX_REPLIES} replies`,
      );
    }

    return thread;
  }
}
