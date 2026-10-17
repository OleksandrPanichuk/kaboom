import type { Page, PageRequest } from "@/core/pagination";
import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { ProblemReviewStatus } from "@/db";
import { ProblemEntity, ProblemsRepository } from "@/modules/problems";

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

  private readonly problems = makeRepository(ProblemsRepository);

  public async execute({ status, page }: Options): Promise<Result> {
    const listed = await this.reviews.list(status, page);
    const ids = listed.items
      .filter((listing) => listing.update && listing.problemId !== null)
      .map((listing) => listing.problemId!);
    const feedback = await this.problems.feedback(ids);

    return {
      ...listed,
      items: listed.items.map((listing) => {
        const found = listing.update
          ? feedback.get(listing.problemId!)
          : undefined;

        return found
          ? {
              ...listing,
              liveRating: ProblemEntity.ratingOf(found),
            }
          : listing;
      }),
    };
  }
}
