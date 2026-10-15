import { createFileRoute } from "@tanstack/react-router";

import { LegalView } from "@/features/marketing";

export const Route = createFileRoute("/_marketing/privacy")({
  component: PrivacyRoute,
});

function PrivacyRoute() {
  return <LegalView document="privacy" />;
}
