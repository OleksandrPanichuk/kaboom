import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/Button";
import { billingAccountQuery } from "@/features/billing/api";
import { BILLING_BANNER_HIDDEN_ON } from "@/features/billing/constants";
import { billingNotice } from "@/features/billing/utils";

export function BillingBanner() {
  const account = useQuery({ ...billingAccountQuery, staleTime: 60_000 });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const hidden = BILLING_BANNER_HIDDEN_ON.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const notice =
    account.data && !hidden ? billingNotice(account.data, new Date()) : null;

  if (!notice) return null;

  const warning = notice.kind === "payment-failed";

  return (
    <div
      role={warning ? "alert" : "status"}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2 text-sm sm:px-6",
        warning
          ? "border-warning-border bg-warning-surface text-warning-foreground"
          : "bg-muted/50",
      )}
    >
      <p className="min-w-0 break-words">
        {notice.kind === "payment-failed"
          ? "We could not take your last Pro payment. Update your card to keep Pro."
          : notice.kind === "payment-unfinished"
            ? "Your Pro payment is not finished yet."
            : `Your Pro subscription ends on ${notice.endsOn}.`}
      </p>
      <Link
        to={
          notice.kind === "payment-unfinished"
            ? "/pricing"
            : "/settings/billing"
        }
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "shrink-0",
        )}
      >
        {notice.kind === "payment-failed"
          ? "Update card"
          : notice.kind === "payment-unfinished"
            ? "Finish paying"
            : "Keep Pro"}
      </Link>
    </div>
  );
}
