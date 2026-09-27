import type { Page, PageRequest } from "@/core/pagination";
import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import { SubmissionsRepository } from "../ports";
import type { SubmissionEntity } from "../submission.entity";

export interface ListSubmissionsUseCaseOptions {
  userId: string;
  slug: string;
  page: PageRequest;
}

type Options = ListSubmissionsUseCaseOptions;
type Result = Page<SubmissionEntity>;

export class ListSubmissionsUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly submissions = makeRepository(SubmissionsRepository);

  public async execute({ userId, slug, page }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);

    return this.submissions.list(userId, problem.id, page);
  }
}
