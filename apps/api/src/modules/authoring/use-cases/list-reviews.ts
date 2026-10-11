import type { Page, PageRequest } from "@/core/pagination";
import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { ProblemReviewStatus } from "@/db";

import type { ReviewListing } from "../draft.entity";
import { ProblemReviewsRepository } from "../ports";

export interface ListReviewsUseCaseOptions {
  status: ProblemReviewStatus;
  page: PageRequest;
}

type Options = ListReviewsUseCaseOptions;
type Result = Page<ReviewListing>;

export class ListReviewsUseCase extends UseCase<Options, Result> {
  private readonly reviews = makeRepository(ProblemReviewsRepository);

  public execute({ status, page }: Options): Promise<Result> {
    return this.reviews.list(status, page);
  }
}
