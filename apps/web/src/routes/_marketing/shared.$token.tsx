import { createFileRoute } from "@tanstack/react-router";

import { sharedQuery, SharedView } from "@/features/sharing";

export const Route = createFileRoute("/_marketing/shared/$token")({
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(sharedQuery(params.token)),
  component: SharedRoute,
});

function SharedRoute() {
  const { token } = Route.useParams();

  return <SharedView token={token} />;
}
