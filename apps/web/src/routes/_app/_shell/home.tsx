import { createFileRoute } from "@tanstack/react-router";

import { HomeView } from "@/features/home";
import { progressQuery } from "@/features/problems";
import { activityQuery } from "@/features/progress";
import { skillsQuery } from "@/features/skills";

export const Route = createFileRoute("/_app/_shell/home")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(progressQuery),
      context.queryClient.ensureQueryData(skillsQuery),
      context.queryClient.ensureQueryData(activityQuery),
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
