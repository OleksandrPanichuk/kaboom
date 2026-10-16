import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import type { ListedComment } from "../problem-comment.entity";
import {
  CommentNotYoursError,
  CommentRemovedError,
} from "../problem-comments.errors";
import { ProblemCommentsRepository } from "../problem-comments.repository";
import { ProblemCommentsService } from "../problem-comments.service";

export interface EditProblemCommentUseCaseOptions {
  userId: string;
  slug: string;
  commentId: string;
  body?: string;
  spoiler?: boolean;
}

type Options = EditProblemCommentUseCaseOptions;

interface Result {
  problemAuthorId: string | null;
  comment: ListedComment;
}

export class EditProblemCommentUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly service = makeService(ProblemCommentsService);

  private readonly comments = makeRepository(ProblemCommentsRepository);

  public async execute({
    userId,
    slug,
    commentId,
    body,
    spoiler,
  }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);
    const comment = await this.service.getOnProblem(commentId, problem.id);

    if (comment.authorId !== userId) {
      throw new CommentNotYoursError("Only its writer can edit a comment");
    }

    const edited = await this.comments.edit(comment.id, {
      body: body?.trim(),
      spoiler,
    });

    if (!edited) throw new CommentRemovedError("That comment was removed");

    return {
      problemAuthorId: problem.authorId,
      comment: await this.service.getListed(edited.id),
    };
  }
}
