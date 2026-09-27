import { createFileRoute } from "@tanstack/react-router";

import { HomeView } from "@/features/home";
import { progressQuery } from "@/features/problems";

export const Route = createFileRoute("/_app/_shell/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(progressQuery),
  component: HomeRoute,
});

function HomeRoute() {
  return <HomeView />;
}
