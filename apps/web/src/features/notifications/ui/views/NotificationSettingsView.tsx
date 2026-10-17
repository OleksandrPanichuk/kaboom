import { Bell } from "lucide-react";

import { SettingsPageHeader } from "@/components/SettingsPageHeader";
import { EmailPreferencesSection } from "@/features/notifications/ui/components";

export function NotificationSettingsView() {
  return (
    <div className="settings-surface flex-1 bg-background px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <SettingsPageHeader
          icon={Bell}
          title="Notifications"
          description="Choose which emails you get from Kaboom."
        />
        <EmailPreferencesSection />
      </div>
    </div>
  );
}
