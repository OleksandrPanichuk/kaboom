import { createFileRoute } from "@tanstack/react-router";

import { ConfirmEmailChangeView, validateTokenSearch } from "@/features/auth";

export const Route = createFileRoute("/confirm-email-change")({
  validateSearch: validateTokenSearch,
  component: ConfirmEmailChangeRoute,
});

function ConfirmEmailChangeRoute() {
  const { token } = Route.useSearch();

  return <ConfirmEmailChangeView token={token} />;
}
