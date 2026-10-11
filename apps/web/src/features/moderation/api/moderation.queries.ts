import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export type ReviewStatus = "pending" | "approved" | "rejected" | "withdrawn";

export const reviewsQuery = (status: ReviewStatus) =>
  queryOptions({
    queryKey: ["problem-reviews", "list", status],
    queryFn: async () =>
      unwrap(await api.api.problemReviews.get({ query: { status } })),
  });

export const reviewQuery = (reviewId: string) =>
  queryOptions({
    queryKey: ["problem-reviews", reviewId],
    queryFn: async () => unwrap(await api.api.problemReviews(reviewId).get()),
  });
