import { createFileRoute } from "@tanstack/react-router";

import {
  DesignsPendingView,
  designsQuery,
  DesignsView,
  validateDesignsSearch,
} from "@/features/designs";

export const Route = createFileRoute("/_app/_shell/designs/")({
  validateSearch: validateDesignsSearch,
  loaderDeps: ({ search }) => ({ kind: search.kind ?? null }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureInfiniteQueryData(designsQuery(deps.kind)),
  pendingComponent: DesignsPendingView,
  component: DesignsRoute,
});

function DesignsRoute() {
  const { kind } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <DesignsView
      kind={kind ?? null}
      onKindChange={(next) =>
        void navigate({
          search: next ? { kind: next } : {},
          replace: true,
        })
      }
      onCreated={(design) =>
        void navigate({
          to: "/designs/$designId",
          params: { designId: design.id },
        })
      }
    />
  );
}
