import { createFileRoute } from "@tanstack/react-router";

import { myProfileQuery, ProfileSettingsView } from "@/features/profile";

export const Route = createFileRoute("/_app/_shell/settings/profile")({
  loader: ({ context }) => context.queryClient.ensureQueryData(myProfileQuery),
  component: ProfileSettingsView,
});
