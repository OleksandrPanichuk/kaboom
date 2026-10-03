import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { InterviewsService } from "@/modules/interviews";

import { ReviewsRepository } from "../ports";
import type { ReviewEntity } from "../review.entity";
import { ReviewNotFoundError } from "../reviews.errors";

export interface GetReviewUseCaseOptions {
  ownerId: string;
  interviewId: string;
}

type Options = GetReviewUseCaseOptions;
type Result = ReviewEntity;

export class GetReviewUseCase extends UseCase<Options, Result> {
  private readonly interviews = makeService(InterviewsService);

  private readonly reviews = makeRepository(ReviewsRepository);

  public async execute({ ownerId, interviewId }: Options): Promise<Result> {
    const interview = await this.interviews.getOwned(interviewId, ownerId);
    const review = await this.reviews.findByInterview(interview.id);

    if (!review)
      throw new ReviewNotFoundError("This interview has no review yet");

    return review;
  }
}
