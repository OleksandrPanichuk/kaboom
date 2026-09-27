import { createFileRoute } from "@tanstack/react-router";

import {
  DesignsPendingView,
  designsQuery,
  DesignsView,
} from "@/features/designs";

export const Route = createFileRoute("/_app/_shell/designs/")({
  loader: ({ context }) =>
    context.queryClient.ensureInfiniteQueryData(designsQuery),
  pendingComponent: DesignsPendingView,
  component: DesignsRoute,
});

function DesignsRoute() {
  const navigate = Route.useNavigate();

  return (
    <DesignsView
      onCreated={(design) =>
        void navigate({
          to: "/designs/$designId",
          params: { designId: design.id },
        })
      }
    />
  );
}
