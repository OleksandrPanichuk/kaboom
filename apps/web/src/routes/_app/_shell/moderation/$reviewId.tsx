import { createFileRoute, notFound } from "@tanstack/react-router";

import { ProblemReviewView, reviewQuery } from "@/features/moderation";
import { ApiRequestError } from "@/lib/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_app/_shell/moderation/$reviewId")({
  loader: async ({ context, params }) => {
    if (!UUID.test(params.reviewId)) throw notFound();

    try {
      await context.queryClient.ensureQueryData(reviewQuery(params.reviewId));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw notFound();
      }

      throw error;
    }
  },
  component: ProblemReviewRoute,
});

function ProblemReviewRoute() {
  const { reviewId } = Route.useParams();
  const navigate = Route.useNavigate();

  return (
    <ProblemReviewView
      reviewId={reviewId}
      onDecided={() => void navigate({ to: "/moderation" })}
    />
  );
}
