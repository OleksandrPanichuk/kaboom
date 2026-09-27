import { createFileRoute } from "@tanstack/react-router";

import { ProfileSettingsView } from "@/features/profile";

export const Route = createFileRoute("/_app/_shell/settings/profile")({
  component: ProfileSettingsView,
});
