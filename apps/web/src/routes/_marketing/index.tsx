import { createFileRoute } from "@tanstack/react-router";

import { LandingView } from "@/features/marketing";

export const Route = createFileRoute("/_marketing/")({
  component: LandingRoute,
});

function LandingRoute() {
  return <LandingView />;
}
