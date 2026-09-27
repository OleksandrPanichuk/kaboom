import { createFileRoute } from "@tanstack/react-router";

import { interviewsQuery, InterviewsView } from "@/features/interview";

export const Route = createFileRoute("/_app/_shell/interviews/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(interviewsQuery),
  component: InterviewsRoute,
});

function InterviewsRoute() {
  const navigate = Route.useNavigate();

  return (
    <InterviewsView
      onOpen={(interviewId) =>
        void navigate({
          to: "/interviews/$interviewId",
          params: { interviewId },
        })
      }
    />
  );
}
