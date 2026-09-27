import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { currentUserQuery } from "@/features/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery);

    if (!user) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }
  },
  component: Outlet,
});
