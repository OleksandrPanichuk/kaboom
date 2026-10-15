import { createFileRoute } from "@tanstack/react-router";

import { LegalView } from "@/features/marketing";

export const Route = createFileRoute("/_marketing/terms")({
  component: TermsRoute,
});

function TermsRoute() {
  return <LegalView document="terms" />;
}
