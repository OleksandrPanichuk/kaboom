import { useSuspenseQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

import { SettingsPageHeader } from "@/components/SettingsPageHeader";
import { connectedAccountsQuery } from "@/features/security/api";
import {
  ConnectedAccountsSection,
  DeleteAccountSection,
  EmailSection,
  PasswordSection,
  SessionsSection,
} from "@/features/security/ui/components";

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
    <div className="settings-surface flex-1 bg-zinc-50/70 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <SettingsPageHeader
          icon={ShieldCheck}
          title="Security"
          description="Manage how you sign in and review where your account is active."
        />
        <PasswordSection hasPassword={hasPassword} />
        <EmailSection hasPassword={hasPassword} />
        <ConnectedAccountsSection linkError={linkError} />
        <SessionsSection />
        <DeleteAccountSection
          hasPassword={hasPassword}
          onDeleted={onAccountDeleted}
        />
      </div>
    </div>
  );
}
