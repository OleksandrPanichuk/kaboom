import { createFileRoute } from "@tanstack/react-router";

import { LegalView } from "@/features/marketing";

export const Route = createFileRoute("/_marketing/cookies")({
  component: CookiesRoute,
});

function CookiesRoute() {
  return <LegalView document="cookies" />;
}
