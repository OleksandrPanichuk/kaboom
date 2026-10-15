import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";

import {
  billingAccountQuery,
  CheckoutView,
  offersQuery,
  validateCheckoutSearch,
} from "@/features/billing";

export const Route = createFileRoute("/_app/_shell/pricing/checkout/")({
  validateSearch: validateCheckoutSearch,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(offersQuery),
      context.queryClient.ensureQueryData(billingAccountQuery),
    ]),
  component: CheckoutRoute,
});

function CheckoutRoute() {
  const { offer } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onPaid = useCallback(
    () =>
      void navigate({ to: "/pricing/checkout/complete", search: { offer } }),
    [navigate, offer],
  );
  const returnUrl = new URL(
    `/pricing/checkout/complete?offer=${encodeURIComponent(offer)}`,
    window.location.origin,
  ).toString();

  return (
    <CheckoutView offerKey={offer} returnUrl={returnUrl} onPaid={onPaid} />
  );
}
