import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { EntitlementsService } from "@/modules/entitlements";
import { InterviewsService } from "@/modules/interviews";

import { ReviewsRepository } from "../ports";
import { ReviewEntity, type ReviewView } from "../review.entity";
import { ReviewNotFoundError } from "../reviews.errors";

export interface GetReviewUseCaseOptions {
  ownerId: string;
  interviewId: string;
}

type Options = GetReviewUseCaseOptions;
type Result = ReviewView;

export class GetReviewUseCase extends UseCase<Options, Result> {
  private readonly interviews = makeService(InterviewsService);

  private readonly entitlements = makeService(EntitlementsService);

  private readonly reviews = makeRepository(ReviewsRepository);

  public async execute({ ownerId, interviewId }: Options): Promise<Result> {
    const interview = await this.interviews.getOwned(interviewId, ownerId);
    const review = await this.reviews.findByInterview(interview.id);

    if (!review)
      throw new ReviewNotFoundError("This interview has no review yet");

    const { entitlements } = await this.entitlements.of(ownerId);

    return entitlements.fullReview
      ? { ...review, detail: "full" }
      : ReviewEntity.asSummary(review);
  }
}
