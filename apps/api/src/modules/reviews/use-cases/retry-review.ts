import { make, makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import {
  type InterviewEntity,
  InterviewsRepository,
  InterviewsService,
  ReviewScheduler,
} from "@/modules/interviews";

import { ReviewNotFailedError } from "../reviews.errors";

export interface RetryReviewUseCaseOptions {
  ownerId: string;
  interviewId: string;
}

type Options = RetryReviewUseCaseOptions;
type Result = InterviewEntity;

export class RetryReviewUseCase extends UseCase<Options, Result> {
  private readonly interviews = makeService(InterviewsService);

  private readonly rows = makeRepository(InterviewsRepository);

  public async execute({ ownerId, interviewId }: Options): Promise<Result> {
    const interview = await this.interviews.getOwned(interviewId, ownerId);
    const reopened = await this.interviews.commit(
      interview.id,
      async (emit) => {
        const updated = await this.rows.transition(
          interview.id,
          "review_failed",
          "reviewing",
        );

        if (updated) await emit("status", { status: updated.status });

        return updated;
      },
    );

    if (!reopened) {
      throw new ReviewNotFailedError("Only a failed review can be retried", {
        status: interview.status,
      });
    }

    await make(ReviewScheduler).schedule(interview.id);

    return reopened;
  }
}
