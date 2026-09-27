import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Link2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import {
  GitHubIcon,
  GoogleIcon,
  oauthErrorMessage,
  type OAuthProvider,
} from "@/features/auth";
import {
  connectedAccountsQuery,
  unlinkProviderMutation,
} from "@/features/security/api";
import { securityErrorMessage } from "@/features/security/utils";

import { SettingsSection } from "./SettingsSection";

const PROVIDERS: ReadonlyArray<{
  provider: OAuthProvider;
  type: "GOOGLE" | "GITHUB";
  label: string;
  icon: typeof GoogleIcon;
}> = [
  { provider: "google", type: "GOOGLE", label: "Google", icon: GoogleIcon },
  { provider: "github", type: "GITHUB", label: "GitHub", icon: GitHubIcon },
];

const RETURN_TO = "/settings/security";

interface ConnectedAccountsSectionProps {
  linkError: string | undefined;
}

export function ConnectedAccountsSection({
  linkError,
}: ConnectedAccountsSectionProps) {
  const { data: accounts } = useSuspenseQuery(connectedAccountsQuery);
  const unlink = useMutation(unlinkProviderMutation);

  return (
    <SettingsSection
      title="Connected accounts"
      description="Sign in with these as well as, or instead of, a password."
      icon={Link2}
    >
      {linkError ? (
        <FieldError>{oauthErrorMessage(linkError)}</FieldError>
      ) : null}
      <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-zinc-50/60">
        {PROVIDERS.map(({ provider, type, label, icon }) => {
          const Icon = icon;
          const account = accounts.find((candidate) => candidate.type === type);

          return (
            <li
              key={provider}
              className="flex items-center justify-between gap-4 p-3.5 sm:px-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon className="size-5 shrink-0" />
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {account ? (account.email ?? "Connected") : "Not connected"}
                  </span>
                </div>
              </div>
              {account ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={!account.canDisconnect || unlink.isPending}
                  title={
                    account.canDisconnect
                      ? undefined
                      : "This is your only way to sign in."
                  }
                  onClick={() => unlink.mutate(provider)}
                >
                  Disconnect
                </Button>
              ) : (
                <form
                  className="shrink-0"
                  method="post"
                  action={`/api/auth/oauth/${provider}/link?redirectTo=${encodeURIComponent(RETURN_TO)}`}
                >
                  <Button type="submit" variant="outline" size="sm">
                    Connect
                  </Button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      {unlink.isError ? (
        <FieldError>{securityErrorMessage(unlink.error)}</FieldError>
      ) : null}
    </SettingsSection>
  );
}
