import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { currentUserQuery } from "@/features/auth";
import { AppShell } from "@/features/shell";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery);

    if (!user) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }
  },
  component: AuthenticatedRoute,
});

function AuthenticatedRoute() {
  const navigate = Route.useNavigate();

  return (
    <AppShell onSignedOut={() => void navigate({ to: "/sign-in" })}>
      <Outlet />
    </AppShell>
  );
}
