import { createFileRoute, notFound } from "@tanstack/react-router";

import { interviewQuery, InterviewView } from "@/features/interview";
import { ApiRequestError } from "@/lib/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute(
  "/_app/(workspace)/interviews/$interviewId",
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
  component: InterviewRoute,
});

function InterviewRoute() {
  const { interviewId } = Route.useParams();

  return <InterviewView interviewId={interviewId} />;
}
