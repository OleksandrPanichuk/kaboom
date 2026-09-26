import { createFileRoute } from "@tanstack/react-router";

import { ResetPasswordView, validateTokenSearch } from "@/features/auth";

export const Route = createFileRoute("/reset-password")({
  validateSearch: validateTokenSearch,
  component: ResetPasswordRoute,
});

function ResetPasswordRoute() {
  const { token } = Route.useSearch();

  return <ResetPasswordView token={token} />;
}
