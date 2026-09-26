import { createFileRoute, redirect } from "@tanstack/react-router";

import { currentUserQuery, safeRedirect } from "@/features/auth";

export const Route = createFileRoute("/_guest")({
  beforeLoad: async ({ context, location }) => {
    if (await context.queryClient.ensureQueryData(currentUserQuery)) {
      const search = location.search as { redirect?: unknown };

      throw redirect({ href: safeRedirect(search.redirect) });
    }
  },
});
