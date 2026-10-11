import { createFileRoute } from "@tanstack/react-router";

import { draftsQuery, DraftsView } from "@/features/authoring";

export const Route = createFileRoute("/_app/_shell/authoring/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(draftsQuery),
  component: DraftsRoute,
});

function DraftsRoute() {
  const navigate = Route.useNavigate();

  return (
    <DraftsView
      onOpen={(draftId) =>
        void navigate({ to: "/authoring/$draftId", params: { draftId } })
      }
    />
  );
}
