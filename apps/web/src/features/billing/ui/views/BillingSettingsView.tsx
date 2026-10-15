import { useSuspenseQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";

import { SettingsPageHeader } from "@/components/SettingsPageHeader";
import { billingAccountQuery } from "@/features/billing/api";
import {
  BillingDetailsSection,
  CardsSection,
  InvoicesSection,
  PlanSection,
  TaxIdsSection,
} from "@/features/billing/ui/components";

export function BillingSettingsView() {
  const { data: account } = useSuspenseQuery(billingAccountQuery);

  return (
    <div className="settings-surface flex-1 bg-background px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <SettingsPageHeader
          icon={CreditCard}
          title="Billing"
          description="Your plan, how you pay and the invoices you have been sent."
        />
        <PlanSection account={account} />
        <CardsSection />
        <BillingDetailsSection customer={account.customer} />
        <TaxIdsSection />
        <InvoicesSection />
      </div>
    </div>
  );
}
