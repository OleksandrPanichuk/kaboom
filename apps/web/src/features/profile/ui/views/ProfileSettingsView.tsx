import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Globe, ImageIcon, UserRound } from "lucide-react";

import { SettingsPageHeader } from "@/components/SettingsPageHeader";
import { SettingsSection } from "@/components/SettingsSection";
import { myProfileQuery } from "@/features/profile/api";
import {
  AvatarField,
  ProfileDetailsForm,
  ProfileNameForm,
} from "@/features/profile/ui/components";

export function ProfileSettingsView() {
  const { data: profile } = useSuspenseQuery(myProfileQuery);

  return (
    <div className="settings-surface flex-1 bg-background px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <SettingsPageHeader
          icon={UserRound}
          title="Profile"
          description="How you appear in Kaboom, and to other people."
        />
        <SettingsSection
          icon={Globe}
          title="Public profile"
          description="What others see on the leaderboard and your profile page."
        >
          <div className="flex flex-col gap-5">
            <Link
              to="/u/$handle"
              params={{ handle: profile.handle }}
              className="text-sm font-medium text-interactive-foreground hover:underline"
            >
              View your profile
            </Link>
            <ProfileDetailsForm profile={profile} />
          </div>
        </SettingsSection>
        <SettingsSection
          icon={ImageIcon}
          title="Avatar"
          description="Shown beside your name."
        >
          <AvatarField profile={profile} />
        </SettingsSection>
        <SettingsSection
          icon={UserRound}
          title="Account name"
          description="Private: used in the app and in emails, never shown to others."
        >
          <ProfileNameForm />
        </SettingsSection>
      </div>
    </div>
  );
}
