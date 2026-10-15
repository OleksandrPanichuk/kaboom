import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Sparkles } from "lucide-react";
import { type ReactNode, useState } from "react";

import { SettingsSection } from "@/components/SettingsSection";
import { Button, buttonVariants } from "@/components/ui/Button";
import {
  type BillingAccount,
  resumeSubscriptionMutation,
} from "@/features/billing/api";
import {
  billingErrorMessage,
  formatBillingDate,
  formatMoney,
} from "@/features/billing/utils";

import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";

interface PlanSectionProps {
  account: BillingAccount;
}

function Summary({
  title,
  detail,
  tone = "default",
}: {
  title: string;
  detail: ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border bg-muted/60 p-3.5 sm:px-4",
        tone === "warning" &&
          "border-warning-border bg-warning-surface text-warning-foreground",
      )}
    >
      <span className="font-semibold">{title}</span>
      <span
        className={cn(
          "text-sm leading-6",
          tone === "default" && "text-muted-foreground",
        )}
      >
        {detail}
      </span>
    </div>
  );
}

const plansLink = (label: string, primary = false) => (
  <Link
    to="/pricing"
    className={cn(buttonVariants({ variant: primary ? "default" : "outline" }))}
  >
    {label}
  </Link>
);

export function PlanSection({ account }: PlanSectionProps) {
  const [cancelling, setCancelling] = useState(false);
  const resume = useMutation(resumeSubscriptionMutation);
  const { subscription, lifetime } = account;
  const periodEnd = formatBillingDate(subscription?.currentPeriodEnd);
  let body: ReactNode;

  if (account.source === "lifetime" && lifetime) {
    body = (
      <>
        <Summary
          title="Pro for life"
          detail={`Paid ${formatMoney(lifetime.amount, lifetime.currency)}${
            lifetime.paidAt ? ` on ${formatBillingDate(lifetime.paidAt)}` : ""
          }. There is nothing more to pay.`}
        />
      </>
    );
  } else if (subscription?.status === "past_due") {
    body = (
      <>
        <Summary
          tone="warning"
          title="Your last payment did not go through"
          detail="We will try your card again over the next few days. Add or choose another card below to keep Pro without a break."
        />
      </>
    );
  } else if (subscription?.status === "incomplete") {
    body = (
      <>
        <Summary
          title="Your subscription is waiting for its first payment"
          detail="Finish paying to start Pro, or leave it and it lapses by itself."
        />
        <div className="flex flex-wrap gap-2">
          {plansLink("Finish paying", true)}
        </div>
      </>
    );
  } else if (subscription && account.source === "subscription") {
    body = subscription.cancelAtPeriodEnd ? (
      <>
        <Summary
          title="Pro, monthly, ending"
          detail={`You keep Pro until ${periodEnd ?? "the end of the period"}. It will not renew.`}
        />
        <div className="flex flex-wrap gap-2">
          <Button disabled={resume.isPending} onClick={() => resume.mutate()}>
            {resume.isPending ? "Keeping it…" : "Keep my subscription"}
          </Button>
        </div>
      </>
    ) : (
      <>
        <Summary
          title="Pro, monthly"
          detail={`Renews on ${periodEnd ?? "the next billing date"}. Cancel any time and keep Pro until then.`}
        />
        <div className="flex flex-wrap gap-2">
          {plansLink("Switch to lifetime")}
          <Button variant="ghost" onClick={() => setCancelling(true)}>
            Cancel subscription
          </Button>
        </div>
        <CancelSubscriptionDialog
          endsOn={periodEnd}
          open={cancelling}
          onOpenChange={setCancelling}
        />
      </>
    );
  } else {
    body = (
      <>
        <Summary
          title="Free"
          detail="Upgrade to Pro monthly, or pay once and keep it for good."
        />
        <div className="flex flex-wrap gap-2">
          {plansLink("See the plans", true)}
        </div>
      </>
    );
  }

  return (
    <SettingsSection
      title="Plan"
      description="What you are on and when it renews."
      icon={Sparkles}
    >
      <div className="flex flex-col gap-4">
        {body}
        {resume.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {billingErrorMessage(resume.error)}
          </p>
        ) : null}
      </div>
    </SettingsSection>
  );
}
