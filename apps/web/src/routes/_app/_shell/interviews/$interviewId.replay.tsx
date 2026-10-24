import { createFileRoute, notFound } from "@tanstack/react-router";

import {
  interviewReplayQuery,
  ReplayLockedView,
  ReplayView,
} from "@/features/interview";
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

      return { locked: false };
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw notFound();
      }

      if (error instanceof ApiRequestError && error.code === "PLAN_LIMIT") {
        return { locked: true };
      }

      throw error;
    }
  },
  component: ReplayRoute,
});

function ReplayRoute() {
  const { interviewId } = Route.useParams();
  const { locked } = Route.useLoaderData();

  return locked ? (
    <ReplayLockedView interviewId={interviewId} />
  ) : (
    <ReplayView interviewId={interviewId} />
  );
}
