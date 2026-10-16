import type { Page, PageRequest } from "@/core/pagination";
import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import type { CommentThread } from "../problem-comment.entity";
import { ProblemCommentsRepository } from "../problem-comments.repository";

export interface ListProblemCommentsUseCaseOptions {
  slug: string;
  page: PageRequest;
}

type Options = ListProblemCommentsUseCaseOptions;

interface Result {
  problemAuthorId: string | null;
  threads: Page<CommentThread>;
}

export class ListProblemCommentsUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly comments = makeRepository(ProblemCommentsRepository);

  public async execute({ slug, page }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);
    const threads = await this.comments.listThreads(problem.id, page);
    const replies = await this.comments.listReplies(
      threads.items.map((thread) => thread.id),
    );

    return {
      problemAuthorId: problem.authorId,
      threads: {
        ...threads,
        items: threads.items.map((thread) => ({
          ...thread,
          replies: replies.filter((reply) => reply.parentId === thread.id),
        })),
      },
    };
  }
}
