import type { BillingOfferModel } from "@repo/api-client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useState } from "react";

import { SegmentedControl } from "@/components/SegmentedControl";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { currentUserQuery } from "@/features/auth";
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

const FREE_ACCOUNT: BillingAccount = {
  plan: "free",
  source: null,
  subscription: null,
  lifetime: null,
  customer: null,
};

const ACTION = cn(buttonVariants({ size: "lg" }), "h-11 w-full");

const checkout = (
  offer: BillingOfferModel,
  label: string,
  signedIn: boolean,
): ReactNode =>
  signedIn ? (
    <Link
      to="/pricing/checkout"
      search={{ offer: offer.key }}
      className={ACTION}
    >
      {label}
      <ArrowRight aria-hidden="true" data-icon="inline-end" />
    </Link>
  ) : (
    <Link
      to="/sign-up"
      search={{ redirect: `/pricing/checkout?offer=${offer.key}` }}
      className={ACTION}
    >
      {label}
      <ArrowRight aria-hidden="true" data-icon="inline-end" />
    </Link>
  );

const settled = (label: string): ReactNode => (
  <Button variant="secondary" size="lg" className="h-11 w-full" disabled>
    {label}
  </Button>
);

const proAction = (
  offer: BillingOfferModel,
  account: BillingAccount,
  signedIn: boolean,
): ReactNode => {
  if (account.source === "lifetime") return settled("You have Pro for life");

  if (offer.type === "recurring") {
    if (account.source === "subscription") {
      return (
        <Link
          to="/settings/billing"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-11 w-full",
          )}
        >
          Manage subscription
        </Link>
      );
    }

    return checkout(
      offer,
      account.subscription?.status === "incomplete"
        ? "Finish paying"
        : "Get Pro monthly",
      signedIn,
    );
  }

  if (account.lifetime?.status === "pending") {
    return checkout(offer, "Finish paying", signedIn);
  }

  return checkout(
    offer,
    account.source === "subscription"
      ? "Switch to lifetime"
      : "Get Pro for life",
    signedIn,
  );
};

export function PricingView() {
  const user = useQuery(currentUserQuery);
  const signedIn = Boolean(user.data);
  const accountQuery = useQuery({ ...billingAccountQuery, enabled: signedIn });
  const account = accountQuery.data ?? FREE_ACCOUNT;
  const offers = useQuery(offersQuery);
  const monthly = offers.data?.find((offer) => offer.type === "recurring");
  const lifetime = offers.data?.find((offer) => offer.type === "one_time");
  const [chosen, setChosen] = useState<Interval | null>(null);
  const interval: Interval =
    chosen ?? (account.source === "lifetime" ? "lifetime" : "monthly");
  const offer =
    interval === "lifetime" ? (lifetime ?? monthly) : (monthly ?? lifetime);
  const months =
    monthly && lifetime && monthly.unitAmount > 0
      ? Math.round(lifetime.unitAmount / monthly.unitAmount)
      : null;

  return (
    <div className="relative isolate overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent)]"
      />
      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-balance sm:text-6xl">
            Start free. Go Pro when you want more.
          </h1>
          <p className="text-base leading-7 text-muted-foreground text-pretty sm:text-lg">
            Every problem and track is free. Pro gives you more interview time
            each day, monthly or paid once for good.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {signedIn ? <CurrentPlanStrip account={account} /> : null}

          <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
            <PlanCard
              title="Free"
              tagline="Everything you need to start practising."
              price="$0"
              cadence="for ever"
              note="No card needed."
              features={FREE_FEATURES}
              action={
                signedIn ? (
                  settled(
                    account.plan === "free"
                      ? "Your current plan"
                      : "Included in Pro",
                  )
                ) : (
                  <Link
                    to="/sign-up"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "h-11 w-full",
                    )}
                  >
                    Start free
                  </Link>
                )
              }
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
                        setChosen(next === "lifetime" ? "lifetime" : "monthly")
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
                action={proAction(offer, account, signedIn)}
              />
            ) : (
              <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
                {offers.isError
                  ? "Prices could not be loaded. Refresh the page to try again."
                  : "Pro is not on sale yet. Check back soon."}
              </div>
            )}
          </div>
        </div>

        <PlanComparison />
        <PlanQuestions />
      </div>
    </div>
  );
}
