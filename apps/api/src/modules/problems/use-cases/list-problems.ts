import type { Track } from "@repo/design";

import type { Page, PageRequest } from "@/core/pagination";
import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { ProblemDifficulty } from "@/db";

import { ProblemsRepository } from "../ports";
import type { ProblemEntity } from "../problem.entity";

export interface ListProblemsUseCaseOptions {
  track?: Track;
  difficulty?: ProblemDifficulty;
  page: PageRequest;
}

type Options = ListProblemsUseCaseOptions;
type Result = Page<ProblemEntity>;

export class ListProblemsUseCase extends UseCase<Options, Result> {
  private readonly problems = makeRepository(ProblemsRepository);

  public async execute({ track, difficulty, page }: Options): Promise<Result> {
    const listed = await this.problems.listPublished(
      { track, difficulty },
      page,
    );
    const ids = listed.items.map((problem) => problem.id);
    const [credits, feedback] = await Promise.all([
      this.problems.credits(ids),
      this.problems.feedback(ids),
    ]);

    return {
      ...listed,
      items: listed.items.map((problem) => ({
        ...problem,
        credit: credits.get(problem.id),
        feedback: feedback.get(problem.id),
      })),
    };
  }
}
