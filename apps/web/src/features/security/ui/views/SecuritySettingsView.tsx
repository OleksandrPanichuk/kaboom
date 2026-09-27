import { useSuspenseQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

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
    <main className="security-settings min-h-full bg-zinc-50/70 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="mb-2 flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50 text-indigo-700 shadow-sm">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-semibold tracking-[0.12em] text-indigo-700 uppercase">
              Account settings
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance">
              Security
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              Manage how you sign in and review where your account is active.
            </p>
          </div>
        </div>
        <PasswordSection hasPassword={hasPassword} />
        <EmailSection hasPassword={hasPassword} />
        <ConnectedAccountsSection linkError={linkError} />
        <SessionsSection />
        <DeleteAccountSection
          hasPassword={hasPassword}
          onDeleted={onAccountDeleted}
        />
      </div>
    </main>
  );
}
