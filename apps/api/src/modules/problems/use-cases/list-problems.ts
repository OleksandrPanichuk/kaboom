import type { Page, PageRequest } from "@/core/pagination";
import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { ProblemDifficulty } from "@/db";

import { ProblemsRepository } from "../ports";
import type { ProblemEntity } from "../problem.entity";

export interface ListProblemsUseCaseOptions {
  track?: string;
  difficulty?: ProblemDifficulty;
  page: PageRequest;
}

type Options = ListProblemsUseCaseOptions;
type Result = Page<ProblemEntity>;

export class ListProblemsUseCase extends UseCase<Options, Result> {
  private readonly problems = makeRepository(ProblemsRepository);

  public execute({ track, difficulty, page }: Options): Promise<Result> {
    return this.problems.listPublished({ track, difficulty }, page);
  }
}
