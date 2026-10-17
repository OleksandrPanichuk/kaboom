import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import type { ListedComment } from "../problem-comment.entity";
import { MAX_REPLIES } from "../problem-comments.constants";
import {
  CommentRemovedError,
  CommentThreadFullError,
} from "../problem-comments.errors";
import { ProblemCommentsRepository } from "../problem-comments.repository";
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

  public async execute({
    authorId,
    slug,
    body,
    spoiler,
    parentId,
  }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);
    const threadId = await this.threadOf(parentId, problem.id);
    const posted = await this.comments.insert({
      problemId: problem.id,
      authorId,
      parentId: threadId,
      body: body.trim(),
      spoiler,
    });

    return {
      problemAuthorId: problem.authorId,
      comment: await this.service.getListed(posted.id),
    };
  }

  private async threadOf(
    parentId: string | null,
    problemId: string,
  ): Promise<string | null> {
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

    return threadId;
  }
}
