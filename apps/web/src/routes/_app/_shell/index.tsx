import { createFileRoute } from "@tanstack/react-router";

import { HomeView } from "@/features/home";
import { progressQuery } from "@/features/problems";
import { skillsQuery } from "@/features/skills";

export const Route = createFileRoute("/_app/_shell/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(progressQuery),
      context.queryClient.ensureQueryData(skillsQuery),
    ]),
  component: HomeRoute,
});

function HomeRoute() {
  const navigate = Route.useNavigate();

  return (
    <HomeView
      onOpenInterview={(interviewId) =>
        void navigate({
          to: "/interviews/$interviewId",
          params: { interviewId },
        })
      }
    />
  );
}
