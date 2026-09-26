import { useSuspenseQuery } from "@tanstack/react-query";

import { connectedAccountsQuery } from "../../api/security.queries";
import { ConnectedAccountsSection } from "../components/ConnectedAccountsSection";
import { DeleteAccountSection } from "../components/DeleteAccountSection";
import { EmailSection } from "../components/EmailSection";
import { PasswordSection } from "../components/PasswordSection";
import { SessionsSection } from "../components/SessionsSection";

interface SecuritySettingsViewProps {
  linkError: string | undefined;
  onAccountDeleted: () => void;
}

export function SecuritySettingsView({
  linkError,
  onAccountDeleted,
}: SecuritySettingsViewProps) {
  const { data: accounts } = useSuspenseQuery(connectedAccountsQuery);
  const hasPassword = accounts.some(
    (account) => account.type === "CREDENTIALS",
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Security</h1>
        <p className="text-muted-foreground">
          How you sign in, and where you are signed in.
        </p>
      </div>
      <PasswordSection hasPassword={hasPassword} />
      <EmailSection hasPassword={hasPassword} />
      <ConnectedAccountsSection linkError={linkError} />
      <SessionsSection />
      <DeleteAccountSection
        hasPassword={hasPassword}
        onDeleted={onAccountDeleted}
      />
    </main>
  );
}
