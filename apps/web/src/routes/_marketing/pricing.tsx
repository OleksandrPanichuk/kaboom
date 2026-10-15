import { createFileRoute } from "@tanstack/react-router";

import { offersQuery, PricingView } from "@/features/billing";

export const Route = createFileRoute("/_marketing/pricing")({
  loader: ({ context }) => context.queryClient.prefetchQuery(offersQuery),
  component: PricingRoute,
});

function PricingRoute() {
  return <PricingView />;
}
