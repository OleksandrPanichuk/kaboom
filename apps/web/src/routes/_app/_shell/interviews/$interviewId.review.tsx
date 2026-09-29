import { createFileRoute, notFound } from "@tanstack/react-router";

import { interviewQuery } from "@/features/interview";
import { ReviewView } from "@/features/reviews";
import { ApiRequestError } from "@/lib/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute(
  "/_app/_shell/interviews/$interviewId/review",
)({
  loader: async ({ context, params }) => {
    if (!UUID.test(params.interviewId)) throw notFound();

    try {
      await context.queryClient.ensureQueryData(
        interviewQuery(params.interviewId),
      );
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw notFound();
      }

      throw error;
    }
  },
  component: ReviewRoute,
});

function ReviewRoute() {
  const { interviewId } = Route.useParams();
  const navigate = Route.useNavigate();

  return (
    <ReviewView
      interviewId={interviewId}
      onOpenInterview={(id) =>
        void navigate({
          to: "/interviews/$interviewId",
          params: { interviewId: id },
        })
      }
    />
  );
}
