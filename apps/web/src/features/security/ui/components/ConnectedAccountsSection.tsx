import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import {
  GitHubIcon,
  GoogleIcon,
  oauthErrorMessage,
  type OAuthProvider,
} from "@/features/auth";

import { unlinkProviderMutation } from "../../api/security.mutations";
import { connectedAccountsQuery } from "../../api/security.queries";
import { securityErrorMessage } from "../../utils/securityErrorMessage";
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
    >
      {linkError ? (
        <FieldError>{oauthErrorMessage(linkError)}</FieldError>
      ) : null}
      <ul className="flex flex-col divide-y rounded-lg border">
        {PROVIDERS.map(({ provider, type, label, icon }) => {
          const Icon = icon;
          const account = accounts.find((candidate) => candidate.type === type);

          return (
            <li
              key={provider}
              className="flex items-center justify-between gap-4 p-3"
            >
              <div className="flex items-center gap-3">
                <Icon className="size-5" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {account ? (account.email ?? "Connected") : "Not connected"}
                  </span>
                </div>
              </div>
              {account ? (
                <Button
                  variant="outline"
                  size="sm"
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
