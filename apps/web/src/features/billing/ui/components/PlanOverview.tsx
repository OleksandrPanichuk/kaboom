import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Sparkles, TriangleAlert } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/Button";
import {
  type BillingAccount,
  offersQuery,
  resumeSubscriptionMutation,
} from "@/features/billing/api";
import {
  billingErrorMessage,
  describeCard,
  describeOffer,
  formatBillingDate,
  formatMoney,
} from "@/features/billing/utils";

import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";

interface PlanOverviewProps {
  account: BillingAccount;
}

type Tone = "success" | "neutral" | "warning" | "interactive";

const TONES: Record<Tone, string> = {
  success: "border-success-border bg-success-surface text-success-foreground",
  neutral: "border-border bg-muted text-muted-foreground",
  warning: "border-warning-border bg-warning-surface text-warning-foreground",
  interactive:
    "border-interactive-border/60 bg-interactive-surface text-interactive-foreground",
};

interface Fact {
  label: string;
  value: string;
  detail?: string;
}

function Facts({ facts }: { facts: Fact[] }) {
  return (
    <dl className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="flex min-w-0 flex-col gap-0.5 bg-card px-4 py-3.5 sm:px-6"
        >
          <dt className="text-xs font-medium text-muted-foreground">
            {fact.label}
          </dt>
          <dd className="truncate font-semibold tabular-nums">{fact.value}</dd>
          {fact.detail ? (
            <dd className="text-xs text-muted-foreground">{fact.detail}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function PlanOverview({ account }: PlanOverviewProps) {
  const [cancelling, setCancelling] = useState(false);
  const resume = useMutation(resumeSubscriptionMutation);
  const offers = useQuery(offersQuery);
  const { subscription, lifetime, customer } = account;
  const monthly = offers.data?.find((offer) => offer.type === "recurring");
  const periodEnd = formatBillingDate(subscription?.currentPeriodEnd);
  const card = customer?.card
    ? describeCard(customer.card.brand, customer.card.last4)
    : "No card saved";

  let name = "Free";
  let status: { label: string; tone: Tone } | null = null;
  let summary = "Upgrade to Pro monthly, or pay once and keep it for good.";
  let facts: Fact[] = [];
  let actions: ReactNode = (
    <Link to="/pricing" className={cn(buttonVariants())}>
      See the plans
    </Link>
  );
  let alert: string | null = null;

  if (account.source === "lifetime" && lifetime) {
    name = "Pro for life";
    status = { label: "Active", tone: "success" };
    summary = "Paid once. Pro stays on your account for good.";
    facts = [
      { label: "Paid", value: formatMoney(lifetime.amount, lifetime.currency) },
      { label: "On", value: formatBillingDate(lifetime.paidAt) ?? "—" },
      { label: "Renews", value: "Never" },
    ];
    actions = null;
  } else if (subscription && subscription.status !== "incomplete") {
    const ending = subscription.cancelAtPeriodEnd;
    const pastDue = subscription.status === "past_due";

    name = "Pro";
    status = pastDue
      ? { label: "Payment failed", tone: "warning" }
      : ending
        ? { label: "Ending", tone: "neutral" }
        : { label: "Active", tone: "success" };
    summary = ending
      ? `You keep Pro until ${periodEnd ?? "the end of the period"}. It will not renew.`
      : pastDue
        ? "Billed monthly. The last renewal is being retried."
        : "Billed monthly. Cancel any time and keep Pro until the period ends.";
    alert = pastDue
      ? "Your bank declined the last renewal. We will try again over the next few days; add or choose another card below to keep Pro without a break."
      : null;
    facts = [
      {
        label: "Price",
        value: monthly ? `${describeOffer(monthly).price} a month` : "Monthly",
      },
      {
        label: ending ? "Ends on" : pastDue ? "Period ends" : "Next payment",
        value: periodEnd ?? "—",
      },
      { label: "Paid with", value: card },
    ];
    actions = ending ? (
      <Button disabled={resume.isPending} onClick={() => resume.mutate()}>
        {resume.isPending ? "Keeping it…" : "Keep my subscription"}
      </Button>
    ) : (
      <>
        <Link
          to="/pricing"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Switch to lifetime
        </Link>
        <Button variant="ghost" onClick={() => setCancelling(true)}>
          Cancel
        </Button>
      </>
    );
  } else if (
    subscription?.status === "incomplete" ||
    lifetime?.status === "pending"
  ) {
    status = { label: "Payment not finished", tone: "interactive" };
    summary =
      "You started paying for Pro but did not finish. Nothing has been charged.";
    actions = (
      <Link to="/pricing" className={cn(buttonVariants())}>
        Finish paying
      </Link>
    );
  }

  const pro = account.plan === "pro";

  return (
    <section
      aria-labelledby="plan-title"
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-card",
        pro ? "border-primary/30" : "border-border",
      )}
    >
      {pro ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.06] to-transparent"
        />
      ) : null}
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl border",
            pro
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-border bg-muted text-subtle-foreground",
          )}
        >
          <Sparkles aria-hidden="true" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">
            Current plan
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="plan-title"
              className="text-2xl font-semibold tracking-[-0.03em]"
            >
              {name}
            </h2>
            {status ? (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  TONES[status.tone],
                )}
              >
                {status.label}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground text-pretty">{summary}</p>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
      {alert ? (
        <div className="relative mx-4 mb-4 flex gap-2.5 rounded-xl border border-warning-border bg-warning-surface p-3 text-sm text-warning-foreground sm:mx-6">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <p className="text-pretty">{alert}</p>
        </div>
      ) : null}
      {facts.length > 0 ? <Facts facts={facts} /> : null}
      {resume.isError ? (
        <p role="alert" className="px-4 pb-4 text-sm text-destructive sm:px-6">
          {billingErrorMessage(resume.error)}
        </p>
      ) : null}
      <CancelSubscriptionDialog
        endsOn={periodEnd}
        open={cancelling}
        onOpenChange={setCancelling}
      />
    </section>
  );
}
