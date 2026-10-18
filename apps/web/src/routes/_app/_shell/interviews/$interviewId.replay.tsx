import { createFileRoute, notFound } from "@tanstack/react-router";

import { interviewReplayQuery, ReplayView } from "@/features/interview";
import { ApiRequestError } from "@/lib/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute(
  "/_app/_shell/interviews/$interviewId/replay",
)({
  loader: async ({ context, params }) => {
    if (!UUID.test(params.interviewId)) throw notFound();

    try {
      await context.queryClient.ensureQueryData(
        interviewReplayQuery(params.interviewId),
      );
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw notFound();
      }

      throw error;
    }
  },
  component: ReplayRoute,
});

function ReplayRoute() {
  const { interviewId } = Route.useParams();

  return <ReplayView interviewId={interviewId} />;
}
