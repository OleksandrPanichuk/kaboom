import { JobReviewScheduler } from "@/adapters/reviews/job.review-scheduler";
import { JobSubmissionReviewScheduler } from "@/adapters/reviews/job.submission-review-scheduler";
import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { ReviewScheduler } from "@/modules/interviews/ports/review-scheduler";
import { SubmissionReviewScheduler } from "@/modules/submissions/ports/submission-review-scheduler";
import { registerJob } from "@/platform/jobs";

import { GenerateReviewJob, ReviewSubmissionJob } from "./jobs";
import { ReviewsRepository } from "./ports";
import { PostgresReviewsRepository } from "./repositories";
import { reviewsRoutes } from "./reviews.routes";
import { GetReviewUseCase, RetryReviewUseCase } from "./use-cases";

export const reviewsModule = defineModule({
  name: "reviews",

  register: () => {
    bind(ReviewsRepository, () => new PostgresReviewsRepository());

    const scheduler = new JobReviewScheduler();

    const submissions = new JobSubmissionReviewScheduler();

    bind(ReviewScheduler, () => scheduler);
    bind(SubmissionReviewScheduler, () => submissions);
    registerJob(GenerateReviewJob);
    registerJob(ReviewSubmissionJob);

    return {};
  },

  routes: () =>
    reviewsRoutes({
      getReview: makeUseCase(GetReviewUseCase),
      retryReview: makeUseCase(RetryReviewUseCase),
    }),
});
