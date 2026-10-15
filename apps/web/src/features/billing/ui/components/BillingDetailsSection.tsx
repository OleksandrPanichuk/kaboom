import { MapPin } from "lucide-react";
import { useState } from "react";

import { SettingsSection } from "@/components/SettingsSection";
import { Button } from "@/components/ui/Button";
import type { BillingAccount } from "@/features/billing/api";

import { BillingDetailsForm } from "./BillingDetailsForm";

interface BillingDetailsSectionProps {
  customer: BillingAccount["customer"];
}

const lines = (customer: NonNullable<BillingAccount["customer"]>): string[] => {
  const address = customer.address;

  if (!address) return [];

  return [
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.state,
    address.country
      ? (new Intl.DisplayNames(["en"], { type: "region" }).of(
          address.country,
        ) ?? address.country)
      : null,
  ].filter((line): line is string => Boolean(line));
};

export function BillingDetailsSection({
  customer,
}: BillingDetailsSectionProps) {
  const [editing, setEditing] = useState(false);
  const shown = customer ? lines(customer) : [];

  return (
    <SettingsSection
      title="Billing details"
      description="The name and address printed on your invoices."
      icon={MapPin}
    >
      {editing ? (
        <BillingDetailsForm
          name={customer?.name ?? null}
          submitLabel="Save details"
          onSaved={() => setEditing(false)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {shown.length > 0 ? (
            <address className="rounded-xl border border-border bg-card p-3.5 text-sm leading-6 not-italic sm:px-4">
              {customer?.name ? (
                <span className="block font-medium">{customer.name}</span>
              ) : null}
              {shown.map((line) => (
                <span key={line} className="block text-muted-foreground">
                  {line}
                </span>
              ))}
            </address>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
              No billing address yet.
            </p>
          )}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              {shown.length > 0 ? "Change details" : "Add an address"}
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
