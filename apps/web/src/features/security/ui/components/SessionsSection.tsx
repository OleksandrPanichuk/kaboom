import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";

import {
  revokeOtherSessionsMutation,
  revokeSessionMutation,
} from "../../api/security.mutations";
import { sessionsQuery } from "../../api/security.queries";
import { describeUserAgent } from "../../utils/describeUserAgent";
import { formatIp } from "../../utils/formatIp";
import { securityErrorMessage } from "../../utils/securityErrorMessage";
import { SettingsSection } from "./SettingsSection";

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
    >
      <ul className="flex flex-col divide-y rounded-lg border">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex items-center justify-between gap-4 p-3"
          >
            <div className="flex flex-col">
              <span className="flex items-center gap-2 text-sm font-medium">
                {describeUserAgent(session.userAgent)}
                {session.current ? (
                  <Badge variant="secondary">This device</Badge>
                ) : null}
              </span>
              <span className="text-xs text-muted-foreground">
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
