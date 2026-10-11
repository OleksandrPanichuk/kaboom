import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import {
  OwnProblemReviewError,
  ReviewDecidedError,
  ReviewNotFoundError,
} from "../authoring.errors";
import type { ReviewListing } from "../draft.entity";
import { ProblemReviewsRepository } from "../ports";

export interface RejectReviewUseCaseOptions {
  reviewerId: string;
  reviewId: string;
  feedback: string;
}

type Options = RejectReviewUseCaseOptions;
type Result = ReviewListing;

export class RejectReviewUseCase extends UseCase<Options, Result> {
  private readonly reviews = makeRepository(ProblemReviewsRepository);

  public async execute({
    reviewerId,
    reviewId,
    feedback,
  }: Options): Promise<Result> {
    const review = await this.reviews.findById(reviewId);

    if (!review) throw new ReviewNotFoundError(`No review ${reviewId}`);
    if (review.authorId === reviewerId) {
      throw new OwnProblemReviewError(
        "Another moderator has to review your own problem",
      );
    }

    const decided = await this.reviews.decide(reviewId, {
      status: "rejected",
      reviewerId,
      feedback: feedback.trim(),
    });

    if (!decided) {
      throw new ReviewDecidedError(`This review is already ${review.status}`);
    }

    return (await this.reviews.findListing(reviewId))!;
  }
}
