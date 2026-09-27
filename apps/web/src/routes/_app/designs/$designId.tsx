import { createFileRoute, notFound } from "@tanstack/react-router";

import { designQuery, DesignView } from "@/features/designs";
import { ApiRequestError } from "@/lib/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_app/designs/$designId")({
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

  return <DesignView designId={designId} />;
}
