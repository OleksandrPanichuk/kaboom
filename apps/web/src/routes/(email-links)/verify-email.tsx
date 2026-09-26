import { createFileRoute } from "@tanstack/react-router";

import { validateTokenSearch, VerifyEmailView } from "@/features/auth";

export const Route = createFileRoute("/(email-links)/verify-email")({
  validateSearch: validateTokenSearch,
  component: VerifyEmailRoute,
});

function VerifyEmailRoute() {
  const { token } = Route.useSearch();

  return <VerifyEmailView token={token} />;
}
