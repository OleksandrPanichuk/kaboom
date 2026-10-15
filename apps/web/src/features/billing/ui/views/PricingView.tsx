import type { BillingOfferModel } from "@repo/api-client";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useState } from "react";

import { SegmentedControl } from "@/components/SegmentedControl";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  type BillingAccount,
  billingAccountQuery,
  offersQuery,
} from "@/features/billing/api";
import { FREE_FEATURES, PRO_FEATURES } from "@/features/billing/constants";
import {
  CurrentPlanStrip,
  PlanCard,
  PlanComparison,
  PlanQuestions,
} from "@/features/billing/ui/components";
import { describeOffer } from "@/features/billing/utils";

type Interval = "monthly" | "lifetime";

const INTERVALS = [
  { value: "monthly", label: "Monthly" },
  { value: "lifetime", label: "Lifetime" },
] as const;

const checkout = (
  offer: BillingOfferModel,
  label: string,
  variant: "default" | "outline" = "default",
) => (
  <Link
    to="/pricing/checkout"
    search={{ offer: offer.key }}
    className={cn(buttonVariants({ variant, size: "lg" }), "w-full")}
  >
    {label}
    <ArrowRight aria-hidden="true" data-icon="inline-end" />
  </Link>
);

const settled = (label: string): ReactNode => (
  <Button variant="secondary" size="lg" className="w-full" disabled>
    {label}
  </Button>
);

const proAction = (
  offer: BillingOfferModel,
  account: BillingAccount,
): ReactNode => {
  if (account.source === "lifetime") return settled("You have Pro for life");

  if (offer.type === "recurring") {
    if (account.source === "subscription") {
      return (
        <Link
          to="/settings/billing"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full",
          )}
        >
          Manage subscription
        </Link>
      );
    }

    return account.subscription?.status === "incomplete"
      ? checkout(offer, "Finish paying")
      : checkout(offer, "Get Pro monthly");
  }

  if (account.lifetime?.status === "pending") {
    return checkout(offer, "Finish paying");
  }

  return checkout(
    offer,
    account.source === "subscription"
      ? "Switch to lifetime"
      : "Get Pro for life",
  );
};

export function PricingView() {
  const { data: account } = useSuspenseQuery(billingAccountQuery);
  const offers = useQuery(offersQuery);
  const monthly = offers.data?.find((offer) => offer.type === "recurring");
  const lifetime = offers.data?.find((offer) => offer.type === "one_time");
  const [interval, setChosenInterval] = useState<Interval>(
    account.source === "lifetime" ? "lifetime" : "monthly",
  );
  const offer =
    interval === "lifetime" ? (lifetime ?? monthly) : (monthly ?? lifetime);
  const months =
    monthly && lifetime && monthly.unitAmount > 0
      ? Math.round(lifetime.unitAmount / monthly.unitAmount)
      : null;

  return (
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">Plans</h1>
          <p className="text-sm leading-6 text-muted-foreground text-pretty sm:text-base">
            Start free. Upgrade when you want more interview time, monthly or
            once for good.
          </p>
        </div>

        <CurrentPlanStrip account={account} />

        <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
          <PlanCard
            title="Free"
            tagline="Everything you need to start practising."
            price="$0"
            cadence="for ever"
            note="No card needed."
            features={FREE_FEATURES}
            action={settled(
              account.plan === "free" ? "Your current plan" : "Included in Pro",
            )}
          />
          {offers.isPending ? (
            <Skeleton className="min-h-96 rounded-2xl" />
          ) : offer ? (
            <PlanCard
              title="Pro"
              tagline="More practice, and the platform keeps growing."
              badge={account.plan === "pro" ? "Your plan" : "Recommended"}
              highlighted
              control={
                monthly && lifetime ? (
                  <SegmentedControl
                    name="interval"
                    label="Billing"
                    value={interval}
                    options={INTERVALS}
                    onChange={(next) =>
                      setChosenInterval(
                        next === "lifetime" ? "lifetime" : "monthly",
                      )
                    }
                  />
                ) : undefined
              }
              price={describeOffer(offer).price}
              cadence={describeOffer(offer).cadence}
              note={
                offer.type === "recurring"
                  ? "Billed monthly. Cancel any time."
                  : months
                    ? `One payment, about ${months} months of monthly. No renewals.`
                    : "One payment. No renewals."
              }
              features={PRO_FEATURES}
              action={proAction(offer, account)}
            />
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
              {offers.isError
                ? "Prices could not be loaded. Refresh the page to try again."
                : "Pro is not on sale yet. Check back soon."}
            </div>
          )}
        </div>

        <PlanComparison />
        <PlanQuestions />
      </div>
    </div>
  );
}
