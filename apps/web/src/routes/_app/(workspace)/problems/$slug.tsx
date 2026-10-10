import { createFileRoute, notFound } from "@tanstack/react-router";

import {
  attemptQuery,
  pinnedVersion,
  problemQuery,
  ProblemView,
} from "@/features/problems";
import { ApiRequestError } from "@/lib/api";

export const Route = createFileRoute("/_app/(workspace)/problems/$slug")({
  loader: async ({ context, params }) => {
    try {
      const attempt = await context.queryClient.ensureQueryData(
        attemptQuery(params.slug),
      );

      await context.queryClient.ensureQueryData(
        problemQuery(params.slug, pinnedVersion(attempt)),
      );
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw notFound();
      }

      throw error;
    }
  },
  component: ProblemRoute,
});

function ProblemRoute() {
  const { slug } = Route.useParams();
  const navigate = Route.useNavigate();

  return (
    <ProblemView
      slug={slug}
      onOpenInterview={(interviewId) =>
        void navigate({
          to: "/interviews/$interviewId",
          params: { interviewId },
        })
      }
    />
  );
}
