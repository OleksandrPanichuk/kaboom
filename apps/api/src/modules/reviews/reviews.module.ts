import { JobReviewScheduler } from "@/adapters/reviews/job.review-scheduler";
import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { ReviewScheduler } from "@/modules/interviews/ports/review-scheduler";
import { registerJob } from "@/platform/jobs";

import { GenerateReviewJob } from "./jobs";
import { ReviewsRepository } from "./ports";
import { PostgresReviewsRepository } from "./repositories";
import { reviewsRoutes } from "./reviews.routes";
import { GetReviewUseCase, RetryReviewUseCase } from "./use-cases";

export const reviewsModule = defineModule({
  name: "reviews",

  register: () => {
    bind(ReviewsRepository, () => new PostgresReviewsRepository());

    const scheduler = new JobReviewScheduler();

    bind(ReviewScheduler, () => scheduler);
    registerJob(GenerateReviewJob);

    return {};
  },

  routes: () =>
    reviewsRoutes({
      getReview: makeUseCase(GetReviewUseCase),
      retryReview: makeUseCase(RetryReviewUseCase),
    }),
});
