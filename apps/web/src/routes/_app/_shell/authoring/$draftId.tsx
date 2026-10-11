import { createFileRoute, notFound } from "@tanstack/react-router";

import { DraftEditorView, draftQuery } from "@/features/authoring";
import { ApiRequestError } from "@/lib/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_app/_shell/authoring/$draftId")({
  loader: async ({ context, params }) => {
    if (!UUID.test(params.draftId)) throw notFound();

    try {
      await context.queryClient.fetchQuery(draftQuery(params.draftId));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw notFound();
      }

      throw error;
    }
  },
  component: DraftEditorRoute,
});

function DraftEditorRoute() {
  const { draftId } = Route.useParams();
  const navigate = Route.useNavigate();

  return (
    <DraftEditorView
      key={draftId}
      draftId={draftId}
      onEditDesign={(designId) =>
        void navigate({
          to: "/designs/$designId",
          params: { designId },
          search: { draft: draftId },
        })
      }
    />
  );
}
