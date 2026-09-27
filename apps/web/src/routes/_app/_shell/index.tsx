import { createFileRoute } from "@tanstack/react-router";

import { HomeView } from "@/features/home";

export const Route = createFileRoute("/_app/_shell/")({
  component: HomeRoute,
});

function HomeRoute() {
  return <HomeView />;
}
