import { createFileRoute, notFound } from "@tanstack/react-router";

import { profileQuery, PublicProfileView } from "@/features/profile";
import { ApiRequestError } from "@/lib/api";

const HANDLE = /^[a-zA-Z0-9_-]{1,20}$/;

export const Route = createFileRoute("/_app/_shell/u/$handle")({
  loader: async ({ context, params }) => {
    if (!HANDLE.test(params.handle)) throw notFound();

    try {
      await context.queryClient.ensureQueryData(profileQuery(params.handle));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw notFound();
      }

      throw error;
    }
  },
  component: PublicProfileRoute,
});

function PublicProfileRoute() {
  const { handle } = Route.useParams();

  return <PublicProfileView handle={handle} />;
}
