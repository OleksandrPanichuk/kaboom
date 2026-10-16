import { createFileRoute } from "@tanstack/react-router";

import {
  emailPreferencesQuery,
  NotificationSettingsView,
} from "@/features/notifications";

export const Route = createFileRoute("/_app/_shell/settings/notifications")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(emailPreferencesQuery),
  component: NotificationsRoute,
});

function NotificationsRoute() {
  return <NotificationSettingsView />;
}
