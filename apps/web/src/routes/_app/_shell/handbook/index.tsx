import { createFileRoute } from "@tanstack/react-router";

import { HandbookView } from "@/features/handbook";

export const Route = createFileRoute("/_app/_shell/handbook/")({
  component: HandbookView,
});
