import { createFileRoute, Outlet } from "@tanstack/react-router";

import { MarketingLayout } from "@/features/marketing";

export const Route = createFileRoute("/_marketing")({
  component: MarketingRoute,
});

function MarketingRoute() {
  return (
    <MarketingLayout>
      <Outlet />
    </MarketingLayout>
  );
}
