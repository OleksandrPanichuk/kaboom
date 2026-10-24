import { createFileRoute } from "@tanstack/react-router";

import {
  weeklyChallengeQuery,
  WeeklyChallengeView,
} from "@/features/weekly-challenge";

export const Route = createFileRoute("/_app/_shell/weekly")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(weeklyChallengeQuery),
  component: WeeklyChallengeView,
});
