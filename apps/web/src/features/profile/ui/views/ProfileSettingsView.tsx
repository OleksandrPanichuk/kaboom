import { UserRound } from "lucide-react";

import { SettingsPageHeader } from "@/components/SettingsPageHeader";
import { SettingsSection } from "@/components/SettingsSection";
import { ProfileNameForm } from "@/features/profile/ui/components";

export function ProfileSettingsView() {
  return (
    <div className="settings-surface flex-1 bg-zinc-50/70 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <SettingsPageHeader
          icon={UserRound}
          title="Profile"
          description="How you appear in Kaboom."
        />
        <SettingsSection
          icon={UserRound}
          title="Name"
          description="What we call you."
        >
          <ProfileNameForm />
        </SettingsSection>
      </div>
    </div>
  );
}
