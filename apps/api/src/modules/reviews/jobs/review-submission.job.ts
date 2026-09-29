import z from "zod";

import { makeRepository, makeUseCase } from "@/core/registry";
import { SubmissionsRepository } from "@/modules/submissions";
import { type EnqueueJobOptions, Job, type JobMeta } from "@/platform/jobs";

import {
  REVIEW_JOB_ATTEMPTS,
  REVIEW_JOB_BACKOFF_MS,
  ReviewQueueJobs,
  REVIEWS_QUEUE,
} from "../reviews.constants";
import { ReviewSubmissionUseCase } from "../use-cases/review-submission";

export const ReviewSubmissionPayloadSchema = z.object({
  submissionId: z.uuid(),
});

export type ReviewSubmissionPayload = z.infer<
  typeof ReviewSubmissionPayloadSchema
>;

export class ReviewSubmissionJob extends Job<ReviewSubmissionPayload> {
  public readonly name = ReviewQueueJobs.ReviewSubmission;
  public readonly queue = REVIEWS_QUEUE;
  public readonly schema = ReviewSubmissionPayloadSchema;

  public readonly defaults: EnqueueJobOptions = {
    attempts: REVIEW_JOB_ATTEMPTS,
    backoff: { type: "exponential", delayMs: REVIEW_JOB_BACKOFF_MS },
  };

  public async handle({
    submissionId,
  }: ReviewSubmissionPayload): Promise<void> {
    await makeUseCase(ReviewSubmissionUseCase).execute({ submissionId });
  }

  public override async failed(
    error: unknown,
    meta: JobMeta,
    payload?: ReviewSubmissionPayload,
  ): Promise<void> {
    await super.failed(error, meta);

    if (payload) {
      await makeRepository(SubmissionsRepository).failReview(
        payload.submissionId,
      );
    }
  }
}
