import type { BillingOfferModel } from "@repo/api-client";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/Button";
import {
  type BillingAccount,
  billingAccountQuery,
  offersQuery,
} from "@/features/billing/api";
import { FREE_FEATURES, PRO_FEATURES } from "@/features/billing/constants";
import { PlanCard } from "@/features/billing/ui/components";
import { describeOffer } from "@/features/billing/utils";

const checkoutLink = (
  offer: BillingOfferModel,
  label: string,
  primary: boolean,
) => (
  <Link
    to="/pricing/checkout"
    search={{ offer: offer.key }}
    className={cn(
      buttonVariants({ variant: primary ? "default" : "outline", size: "lg" }),
      "w-full",
    )}
  >
    {label}
  </Link>
);

const current = (label: string): ReactNode => (
  <Button variant="secondary" size="lg" className="w-full" disabled>
    {label}
  </Button>
);

const monthlyAction = (
  offer: BillingOfferModel,
  account: BillingAccount,
): ReactNode => {
  if (account.source === "lifetime") return current("Included in your plan");
  if (account.source === "subscription") return current("Your plan");
  if (account.subscription?.status === "incomplete") {
    return checkoutLink(offer, "Finish paying", true);
  }

  return checkoutLink(offer, "Subscribe", true);
};

const lifetimeAction = (
  offer: BillingOfferModel,
  account: BillingAccount,
): ReactNode => {
  if (account.source === "lifetime") return current("Yours for life");
  if (account.lifetime?.status === "pending") {
    return checkoutLink(offer, "Finish paying", false);
  }

  return checkoutLink(
    offer,
    account.source === "subscription" ? "Switch to lifetime" : "Buy for life",
    false,
  );
};

export function PricingView() {
  const { data: account } = useSuspenseQuery(billingAccountQuery);
  const offers = useQuery(offersQuery);
  const monthly = offers.data?.find((offer) => offer.type === "recurring");
  const lifetime = offers.data?.find((offer) => offer.type === "one_time");

  return (
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-interactive-foreground uppercase">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Plans
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
            Practise more with Pro
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground text-pretty sm:text-base">
            Pay monthly and cancel whenever you like, or pay once and keep Pro
            for good. Switching from monthly to lifetime ends the subscription
            the moment lifetime is paid.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <PlanCard
            title="Free"
            price="$0"
            cadence="for ever"
            description="Everything you need to start practising."
            features={FREE_FEATURES}
            action={
              account.plan === "free"
                ? current("Your plan")
                : current("Included in Pro")
            }
          />
          {monthly ? (
            <PlanCard
              title="Pro"
              highlighted={account.source !== "lifetime"}
              badge={account.source === "subscription" ? "Current" : undefined}
              price={describeOffer(monthly).price}
              cadence={describeOffer(monthly).cadence}
              description="Billed monthly. Cancel any time and keep Pro until the period ends."
              features={PRO_FEATURES}
              action={monthlyAction(monthly, account)}
            />
          ) : null}
          {lifetime ? (
            <PlanCard
              title="Pro for life"
              highlighted={account.source === "lifetime"}
              badge={account.source === "lifetime" ? "Current" : "Pay once"}
              price={describeOffer(lifetime).price}
              cadence={describeOffer(lifetime).cadence}
              description="One payment, no renewals. Pro stays yours."
              features={PRO_FEATURES}
              action={lifetimeAction(lifetime, account)}
            />
          ) : null}
        </div>

        {offers.isSuccess && !monthly && !lifetime ? (
          <p
            role="status"
            className="rounded-xl border border-dashed bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground"
          >
            Pro is not on sale yet. Check back soon.
          </p>
        ) : null}
        {offers.isError ? (
          <p
            role="alert"
            className="rounded-xl border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning-foreground"
          >
            Prices could not be loaded. Refresh the page to try again.
          </p>
        ) : null}
      </div>
    </div>
  );
}
