import type { Page, PageRequest } from "@/core/pagination";
import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { InterviewSummaryEntity } from "../interview.entity";
import { InterviewsRepository } from "../ports";

export interface ListInterviewsUseCaseOptions {
  ownerId: string;
  page: PageRequest;
}

type Options = ListInterviewsUseCaseOptions;
type Result = Page<InterviewSummaryEntity>;

export class ListInterviewsUseCase extends UseCase<Options, Result> {
  private readonly interviews = makeRepository(InterviewsRepository);

  public execute({ ownerId, page }: Options): Promise<Result> {
    return this.interviews.listOwned(ownerId, page);
  }
}
