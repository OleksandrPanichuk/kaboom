import { createFileRoute } from "@tanstack/react-router";

import {
  connectedAccountsQuery,
  SecuritySettingsView,
  sessionsQuery,
  validateSecuritySearch,
} from "@/features/security";

export const Route = createFileRoute("/_app/_shell/settings/security")({
  validateSearch: validateSecuritySearch,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(connectedAccountsQuery),
      context.queryClient.ensureQueryData(sessionsQuery),
    ]),
  component: SecurityRoute,
});

function SecurityRoute() {
  const { error } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <SecuritySettingsView
      linkError={error}
      onAccountDeleted={() => void navigate({ to: "/sign-in" })}
    />
  );
}
