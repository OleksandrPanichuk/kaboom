import { createFileRoute, notFound } from "@tanstack/react-router";

import {
  reviewsQuery,
  ReviewsQueueView,
  type ReviewStatus,
} from "@/features/moderation";
import { ApiRequestError } from "@/lib/api";

const STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

interface ModerationSearch {
  status?: ReviewStatus;
}

export const Route = createFileRoute("/_app/_shell/moderation/")({
  validateSearch: (search: Record<string, unknown>): ModerationSearch =>
    STATUSES.includes(search.status as ReviewStatus)
      ? { status: search.status as ReviewStatus }
      : {},
  loaderDeps: ({ search }) => ({ status: search.status ?? "pending" }),
  loader: async ({ context, deps }) => {
    try {
      await context.queryClient.ensureQueryData(reviewsQuery(deps.status));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 403) {
        throw notFound();
      }

      throw error;
    }
  },
  component: ReviewsRoute,
});

function ReviewsRoute() {
  const { status } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ReviewsQueueView
      status={status ?? "pending"}
      onStatusChange={(next) =>
        void navigate({
          search: next === "pending" ? {} : { status: next },
        })
      }
    />
  );
}
