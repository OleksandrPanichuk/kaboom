import { createFileRoute } from "@tanstack/react-router";

import { progressQuery } from "@/features/problems";
import {
  activityQuery,
  ProgressView,
  skillHistoryQuery,
} from "@/features/progress";
import { skillsQuery } from "@/features/skills";

export const Route = createFileRoute("/_app/_shell/progress")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(progressQuery),
      context.queryClient.ensureQueryData(activityQuery),
      context.queryClient.ensureQueryData(skillHistoryQuery),
      context.queryClient.ensureQueryData(skillsQuery),
    ]),
  component: ProgressRoute,
});

function ProgressRoute() {
  return <ProgressView />;
}
