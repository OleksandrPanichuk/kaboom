import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import type {
  ListedComment,
  ProblemCommentEntity,
} from "./problem-comment.entity";
import { ProblemCommentNotFoundError } from "./problem-comments.errors";
import { ProblemCommentsRepository } from "./problem-comments.repository";

export class ProblemCommentsService extends Service {
  private readonly comments = makeRepository(ProblemCommentsRepository);

  public async getOnProblem(
    id: string,
    problemId: string,
  ): Promise<ProblemCommentEntity> {
    const comment = await this.comments.findById(id);

    if (comment?.problemId !== problemId) {
      throw new ProblemCommentNotFoundError("Comment not found");
    }

    return comment;
  }

  public async getListed(id: string): Promise<ListedComment> {
    const comment = await this.comments.findListed(id);

    if (!comment) throw new ProblemCommentNotFoundError("Comment not found");

    return comment;
  }
}
