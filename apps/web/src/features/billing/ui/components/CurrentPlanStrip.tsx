import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import type { BillingAccount } from "@/features/billing/api";
import { formatBillingDate } from "@/features/billing/utils";

interface CurrentPlanStripProps {
  account: BillingAccount;
}

const describe = (
  account: BillingAccount,
): { title: string; detail: string } | null => {
  const end = formatBillingDate(account.subscription?.currentPeriodEnd);

  if (account.source === "lifetime") {
    return {
      title: "You have Pro for life",
      detail: "Nothing more to pay, ever.",
    };
  }

  if (account.source === "subscription" && account.subscription) {
    if (account.subscription.status === "past_due") {
      return {
        title: "You are on Pro, monthly",
        detail:
          "Your last renewal did not go through. Update your card to keep Pro.",
      };
    }

    return account.subscription.cancelAtPeriodEnd
      ? {
          title: "You are on Pro, monthly",
          detail: `Ends on ${end ?? "the end of the period"}. It will not renew.`,
        }
      : {
          title: "You are on Pro, monthly",
          detail: `Renews on ${end ?? "the next billing date"}.`,
        };
  }

  return null;
};

export function CurrentPlanStrip({ account }: CurrentPlanStripProps) {
  const described = describe(account);

  if (!described) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
        <Sparkles aria-hidden="true" className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-semibold">{described.title}</p>
        <p className="text-sm text-muted-foreground text-pretty">
          {described.detail}
        </p>
      </div>
      <Link
        to="/settings/billing"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "w-fit shrink-0",
        )}
      >
        Manage billing
      </Link>
    </div>
  );
}
