import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/Button";
import { billingAccountQuery } from "@/features/billing/api";
import {
  CHECKOUT_POLL_LIMIT_MS,
  CHECKOUT_POLL_MS,
} from "@/features/billing/constants";

interface CheckoutCompleteViewProps {
  failed: boolean;
}

export function CheckoutCompleteView({ failed }: CheckoutCompleteViewProps) {
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const account = useQuery({
    ...billingAccountQuery,
    refetchInterval: (query) =>
      failed || waitedTooLong || query.state.data?.plan === "pro"
        ? false
        : CHECKOUT_POLL_MS,
  });
  const pro = account.data?.plan === "pro";

  useEffect(() => {
    const timer = window.setTimeout(
      () => setWaitedTooLong(true),
      CHECKOUT_POLL_LIMIT_MS,
    );

    return () => window.clearTimeout(timer);
  }, []);

  const state = failed
    ? {
        icon: CircleAlert,
        tone: "text-danger-foreground",
        title: "The payment did not go through",
        body: "Your bank or card declined it, and nothing was charged. Try again, perhaps with another card.",
      }
    : pro
      ? {
          icon: CircleCheck,
          tone: "text-success-foreground",
          title:
            account.data?.source === "lifetime"
              ? "Pro is yours for life"
              : "Welcome to Pro",
          body: "Your payment went through, and a confirmation is on its way to your inbox.",
        }
      : waitedTooLong
        ? {
            icon: CircleAlert,
            tone: "text-warning-foreground",
            title: "Your payment is still being confirmed",
            body: "This can take a few minutes for some banks. Pro turns on by itself once it is confirmed; you can leave this page.",
          }
        : {
            icon: LoaderCircle,
            tone: "text-interactive-foreground animate-spin",
            title: "Confirming your payment",
            body: "This usually takes a few seconds.",
          };
  const Icon = state.icon;

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-12">
      <div
        role="status"
        className="flex max-w-md flex-col items-center gap-4 text-center"
      >
        <span className="grid size-12 place-items-center rounded-2xl border bg-card shadow-card">
          <Icon aria-hidden="true" className={cn("size-6", state.tone)} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">
            {state.title}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground text-pretty">
            {state.body}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {failed ? (
            <Link to="/pricing" className={cn(buttonVariants())}>
              Try again
            </Link>
          ) : (
            <Link to="/home" className={cn(buttonVariants())}>
              Start practising
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
