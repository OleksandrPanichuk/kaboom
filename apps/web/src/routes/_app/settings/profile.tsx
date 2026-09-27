import { createFileRoute } from "@tanstack/react-router";

import { ProfileSettingsView } from "@/features/profile";

export const Route = createFileRoute("/_app/settings/profile")({
  component: ProfileSettingsView,
});
