import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { ThemeSync } from "@/features/shell";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <ThemeSync />
      <Outlet />
    </div>
  );
}
