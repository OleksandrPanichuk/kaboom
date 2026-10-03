import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getReviewRoute, retryReviewRoute } from "./routes";
import type { GetReviewUseCase, RetryReviewUseCase } from "./use-cases";

export interface ReviewsActions {
  getReview: Executable<GetReviewUseCase>;
  retryReview: Executable<RetryReviewUseCase>;
}

export const reviewsRoutes = (actions: ReviewsActions) =>
  new Elysia({ name: "reviews", prefix: "/interviews" })
    .get("/:id/review", ...getReviewRoute(actions))
    .post("/:id/review/retry", ...retryReviewRoute(actions));
