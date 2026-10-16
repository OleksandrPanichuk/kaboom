import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";
import { hasRole, UsersService } from "@/modules/users";

import { CommentNotYoursError } from "../problem-comments.errors";
import { ProblemCommentsRepository } from "../problem-comments.repository";
import { ProblemCommentsService } from "../problem-comments.service";

export interface RemoveProblemCommentUseCaseOptions {
  userId: string;
  slug: string;
  commentId: string;
}

type Options = RemoveProblemCommentUseCaseOptions;
type Result = void;

export class RemoveProblemCommentUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly users = makeService(UsersService);

  private readonly service = makeService(ProblemCommentsService);

  private readonly comments = makeRepository(ProblemCommentsRepository);

  public async execute({ userId, slug, commentId }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);
    const comment = await this.service.getOnProblem(commentId, problem.id);

    if (comment.removedAt !== null) return;

    if (comment.authorId === userId) {
      await this.comments.remove(comment.id, "author");

      return;
    }

    const { role } = await this.users.getById(userId);

    if (!hasRole(role, "moderator")) {
      throw new CommentNotYoursError(
        "Only its writer or a moderator can remove a comment",
      );
    }

    await this.comments.remove(comment.id, "moderator");
  }
}
