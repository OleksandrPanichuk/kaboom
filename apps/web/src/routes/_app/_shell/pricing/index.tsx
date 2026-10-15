import { createFileRoute } from "@tanstack/react-router";

import { billingAccountQuery, PricingView } from "@/features/billing";

export const Route = createFileRoute("/_app/_shell/pricing/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(billingAccountQuery),
  component: PricingRoute,
});

function PricingRoute() {
  return <PricingView />;
}
