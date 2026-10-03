import { MINUTE, SECOND } from "@/constants";

export const REVIEWS_QUEUE = "reviews";

export const ReviewQueueJobs = {
  GenerateReview: "reviews.generate",
  ReviewSubmission: "reviews.review-submission",
} as const;

export const REVIEW_PROMPT_VERSION = 1;

export const REVIEW_MAX_OUTPUT_TOKENS = 4_096;

export const REVIEW_JOB_ATTEMPTS = 3;

export const REVIEW_JOB_BACKOFF_MS = 30 * SECOND;

export const RETRY_REVIEW_RATE_LIMIT = {
  limit: 5,
  windowMs: 10 * MINUTE,
  scope: "reviews:retry",
} as const;
