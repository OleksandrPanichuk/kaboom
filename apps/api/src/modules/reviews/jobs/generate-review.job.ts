import z from "zod";

import { makeService, makeUseCase } from "@/core/registry";
import { type EnqueueJobOptions, Job, type JobMeta } from "@/platform/jobs";

import {
  REVIEW_JOB_ATTEMPTS,
  REVIEW_JOB_BACKOFF_MS,
  ReviewQueueJobs,
  REVIEWS_QUEUE,
} from "../reviews.constants";
import { ReviewsService } from "../reviews.service";
import { GenerateReviewUseCase } from "../use-cases/generate-review";

export const GenerateReviewPayloadSchema = z.object({
  interviewId: z.uuid(),
});

export type GenerateReviewPayload = z.infer<typeof GenerateReviewPayloadSchema>;

export class GenerateReviewJob extends Job<GenerateReviewPayload> {
  public readonly name = ReviewQueueJobs.GenerateReview;
  public readonly queue = REVIEWS_QUEUE;
  public readonly schema = GenerateReviewPayloadSchema;

  public readonly defaults: EnqueueJobOptions = {
    attempts: REVIEW_JOB_ATTEMPTS,
    backoff: { type: "exponential", delayMs: REVIEW_JOB_BACKOFF_MS },
  };

  public async handle({ interviewId }: GenerateReviewPayload): Promise<void> {
    await makeUseCase(GenerateReviewUseCase).execute({ interviewId });
  }

  public override async failed(
    error: unknown,
    meta: JobMeta,
    payload?: GenerateReviewPayload,
  ): Promise<void> {
    await super.failed(error, meta);

    if (payload) await makeService(ReviewsService).fail(payload.interviewId);
  }
}
