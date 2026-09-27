import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/features/shell";

export const Route = createFileRoute("/_app/_shell")({
  component: ShellRoute,
});

function ShellRoute() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
