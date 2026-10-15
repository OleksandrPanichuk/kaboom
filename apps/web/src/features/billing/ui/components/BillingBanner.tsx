import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "cn";
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  type LucideIcon,
  TriangleAlert,
  X,
} from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/Button";
import { billingAccountQuery } from "@/features/billing/api";
import { BILLING_BANNER_HIDDEN_ON } from "@/features/billing/constants";
import { type BillingNotice, billingNotice } from "@/features/billing/utils";

const DISMISSED_KEY = "kaboom:billing-notice-dismissed";

interface NoticeCopy {
  icon: LucideIcon;
  title: string;
  body: string;
  action: string;
  to: "/pricing" | "/settings/billing";
  tone: "warning" | "interactive" | "neutral";
  dismissible: boolean;
}

const copyOf = (notice: BillingNotice): NoticeCopy => {
  switch (notice.kind) {
    case "payment-failed":
      return {
        icon: TriangleAlert,
        title: "Your Pro renewal did not go through",
        body: "Your bank declined the last payment. We will retry over the next few days; update your card to keep Pro without a break.",
        action: "Update card",
        to: "/settings/billing",
        tone: "warning",
        dismissible: false,
      };
    case "payment-unfinished":
      return {
        icon: CreditCard,
        title: "Your Pro payment is not finished",
        body: "Pick up where you left off. Nothing has been charged yet.",
        action: "Finish paying",
        to: "/pricing",
        tone: "interactive",
        dismissible: true,
      };
    case "ending":
      return {
        icon: CalendarClock,
        title: `Pro ends on ${notice.endsOn}`,
        body: "You cancelled your subscription. Keep it to stay on Pro without a gap.",
        action: "Keep Pro",
        to: "/settings/billing",
        tone: "neutral",
        dismissible: true,
      };
  }
};

const readDismissed = (): string | null => {
  try {
    return sessionStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
};

const writeDismissed = (kind: string) => {
  try {
    sessionStorage.setItem(DISMISSED_KEY, kind);
  } catch {
    return;
  }
};

export function BillingBanner() {
  const account = useQuery({ ...billingAccountQuery, staleTime: 60_000 });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [dismissed, setDismissed] = useState(readDismissed);
  const hidden = BILLING_BANNER_HIDDEN_ON.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const notice =
    account.data && !hidden ? billingNotice(account.data, new Date()) : null;

  if (!notice || dismissed === notice.kind) return null;

  const copy = copyOf(notice);
  const Icon = copy.icon;

  return (
    <div className="px-4 pt-4 sm:px-8 sm:pt-5">
      <div
        role={copy.tone === "warning" ? "alert" : "status"}
        className={cn(
          "mx-auto flex max-w-6xl items-start gap-3 rounded-2xl border p-3.5 shadow-card sm:items-center sm:gap-4 sm:p-4",
          copy.tone === "warning"
            ? "border-warning-border bg-warning-surface"
            : "border-border bg-card",
        )}
      >
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl border",
            copy.tone === "warning" &&
              "border-warning-border bg-card text-warning-foreground",
            copy.tone === "interactive" &&
              "border-interactive-border/60 bg-interactive-surface text-interactive-foreground",
            copy.tone === "neutral" &&
              "border-border bg-muted text-subtle-foreground",
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p
              className={cn(
                "text-sm font-semibold",
                copy.tone === "warning" && "text-warning-foreground",
              )}
            >
              {copy.title}
            </p>
            <p
              className={cn(
                "text-sm leading-5 text-pretty",
                copy.tone === "warning"
                  ? "text-warning-foreground/90"
                  : "text-muted-foreground",
              )}
            >
              {copy.body}
            </p>
          </div>
          <Link
            to={copy.to}
            className={cn(
              buttonVariants({
                variant: copy.tone === "warning" ? "default" : "outline",
                size: "sm",
              }),
              "w-fit shrink-0",
            )}
          >
            {copy.action}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>
        {copy.dismissible ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="-mt-1 -mr-1 shrink-0 text-muted-foreground sm:mt-0"
            aria-label="Hide for now"
            onClick={() => {
              writeDismissed(notice.kind);
              setDismissed(notice.kind);
            }}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
