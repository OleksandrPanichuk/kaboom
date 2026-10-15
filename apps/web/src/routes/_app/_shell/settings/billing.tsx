import { createFileRoute } from "@tanstack/react-router";

import { billingAccountQuery, BillingSettingsView } from "@/features/billing";

export const Route = createFileRoute("/_app/_shell/settings/billing")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(billingAccountQuery),
  component: BillingSettingsRoute,
});

function BillingSettingsRoute() {
  return <BillingSettingsView />;
}
