import { createFileRoute } from "@tanstack/react-router";

import {
  CheckoutCompleteView,
  validateCheckoutCompleteSearch,
} from "@/features/billing";

export const Route = createFileRoute("/_app/_shell/pricing/checkout/complete")({
  validateSearch: validateCheckoutCompleteSearch,
  component: CheckoutCompleteRoute,
});

function CheckoutCompleteRoute() {
  const { redirect_status: status } = Route.useSearch();

  return <CheckoutCompleteView failed={status === "failed"} />;
}
