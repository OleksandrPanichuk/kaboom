import { createFileRoute, notFound } from "@tanstack/react-router";

import { designQuery, DesignView } from "@/features/designs";
import { ApiRequestError } from "@/lib/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface DesignSearch {
  draft?: string;
}

export const Route = createFileRoute("/_app/(workspace)/designs/$designId")({
  validateSearch: (search: Record<string, unknown>): DesignSearch =>
    typeof search.draft === "string" && UUID.test(search.draft)
      ? { draft: search.draft }
      : {},
  loader: async ({ context, params }) => {
    if (!UUID.test(params.designId)) throw notFound();

    try {
      await context.queryClient.ensureQueryData(designQuery(params.designId));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw notFound();
      }

      throw error;
    }
  },
  component: DesignRoute,
});

function DesignRoute() {
  const { designId } = Route.useParams();
  const { draft } = Route.useSearch();

  return <DesignView designId={designId} draftId={draft ?? null} />;
}
