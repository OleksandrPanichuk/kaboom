import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";

import { SettingsSection } from "@/components/SettingsSection";
import { Switch } from "@/components/ui/Switch";
import { errorMessage } from "@/features/auth";
import {
  emailPreferencesQuery,
  updateEmailPreferencesMutation,
} from "@/features/notifications/api";

export function EmailPreferencesSection() {
  const { data: preferences } = useSuspenseQuery(emailPreferencesQuery);
  const update = useMutation(updateEmailPreferencesMutation);

  return (
    <SettingsSection
      icon={Mail}
      title="Email"
      description="Security, sign-in, billing and review emails always go out. These you can turn off."
    >
      <div className="flex flex-col gap-4">
        {(
          [
            {
              key: "comments",
              label: "Comments",
              detail:
                "New comments on problems you wrote, and replies in conversations you took part in. They arrive as one email every few minutes at most, not one per comment.",
            },
            {
              key: "reminders",
              label: "Practice reminders",
              detail:
                "One email on Thursday when your plan for the week still has problems left.",
            },
          ] as const
        ).map(({ key, label, detail }) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`email-${key}`} className="text-sm font-medium">
                {label}
              </label>
              <p className="text-sm text-muted-foreground text-pretty">
                {detail}
              </p>
            </div>
            <Switch
              id={`email-${key}`}
              className="mt-0.5 shrink-0"
              checked={preferences[key]}
              onCheckedChange={(on) => update.mutate({ [key]: on })}
            />
          </div>
        ))}
        {update.error ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(update.error)}
          </p>
        ) : null}
      </div>
    </SettingsSection>
  );
}
