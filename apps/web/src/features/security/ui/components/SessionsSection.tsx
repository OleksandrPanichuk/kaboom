import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { MonitorSmartphone } from "lucide-react";

import { SettingsSection } from "@/components/SettingsSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import {
  revokeOtherSessionsMutation,
  revokeSessionMutation,
  sessionsQuery,
} from "@/features/security/api";
import {
  describeUserAgent,
  formatIp,
  securityErrorMessage,
} from "@/features/security/utils";

const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function SessionsSection() {
  const { data: sessions } = useSuspenseQuery(sessionsQuery);
  const revoke = useMutation(revokeSessionMutation);
  const revokeOthers = useMutation(revokeOtherSessionsMutation);
  const others = sessions.filter((session) => !session.current);
  const error = revoke.error ?? revokeOthers.error;

  return (
    <SettingsSection
      title="Where you are signed in"
      description="Sign out of a device you no longer use or do not recognise."
      icon={MonitorSmartphone}
    >
      <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-zinc-50/60">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex items-center justify-between gap-4 p-3.5 sm:px-4"
          >
            <div className="flex min-w-0 flex-col">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {describeUserAgent(session.userAgent)}
                {session.current ? (
                  <Badge variant="secondary">This device</Badge>
                ) : null}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {[
                  formatIp(session.ip),
                  `since ${dateTime.format(new Date(session.createdAt))}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            {session.current ? null : (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(session.id)}
              >
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
      {others.length > 0 ? (
        <div>
          <Button
            variant="outline"
            disabled={revokeOthers.isPending}
            onClick={() => revokeOthers.mutate()}
          >
            Sign out everywhere else
          </Button>
        </div>
      ) : null}
      {error ? <FieldError>{securityErrorMessage(error)}</FieldError> : null}
    </SettingsSection>
  );
}
